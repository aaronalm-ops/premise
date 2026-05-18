// Variant-judge probe runner (D-046, closes E-3).
//
// D-040 introduced is_recommended on question variants — the generator marks
// the variant it would pick as the fatigue-default. This probe asks an
// independent Sonnet judge "given these 3 variants for the same construct,
// which would you recommend as the default?" and measures agreement.
//
// Closes the loop the audit deferred: instead of waiting for selection_mode
// telemetry from real usage, the judge probe gives us a synthetic signal we
// can run on every prompt change. Real selection_mode telemetry remains the
// long-run truth source; this probe is the short-loop check.

import { generateQuestions } from "@/lib/rag/question-generator";
import { MODELS, getAnthropic } from "@/lib/llm/anthropic";
import { withRetry } from "@/lib/api/retry";
import { loadProbesOfType } from "../lib/load-probes";
import type { VariantJudgeProbe, ProbeResult } from "../lib/types";
import type { QuestionDraft } from "@/lib/rag/types";
import {
  synthHypothesis,
  synthPersona,
  makeSyntheticBriefId,
  type SynthHypothesis,
  type SynthPersona,
} from "../lib/synth";

type VariantJudgeFixture = VariantJudgeProbe & {
  context: {
    accepted_hypotheses: SynthHypothesis[];
    accepted_personas: SynthPersona[];
  };
};

const JUDGE_TOOL = {
  name: "pick_recommended_variant",
  description:
    "For each question, returns the index (0/1/2) of the variant that should be the fatigue-default for a research wave.",
  input_schema: {
    type: "object" as const,
    properties: {
      picks: {
        type: "array",
        items: { type: "integer", minimum: 0, maximum: 2 },
      },
    },
    required: ["picks"],
  },
};

const JUDGE_SYSTEM = `You are a senior survey methodologist. For each question you receive, you are shown 3 variants from different methodological frames (neutral_direct, leading, projective, behavioural, attitudinal, forced_choice, constant_sum, maxdiff). Pick the variant that should be the fatigue-default — the one that elicits the most reliable signal while remaining respondent-friendly. Return one integer index (0/1/2) per question in order.`;

export async function runVariantJudge(
  projectId: string,
): Promise<ProbeResult[]> {
  const probes = loadProbesOfType<VariantJudgeFixture>("variant-judge");
  const out: ProbeResult[] = [];
  for (const probe of probes) {
    out.push(await runOne(probe, projectId));
  }
  return out;
}

async function runOne(
  probe: VariantJudgeFixture,
  projectId: string,
): Promise<ProbeResult> {
  const start = Date.now();
  const reasons: string[] = [];

  try {
    const briefId = makeSyntheticBriefId();
    const hypotheses = probe.context.accepted_hypotheses.map((h, i) =>
      synthHypothesis(h, projectId, briefId, i + 1),
    );
    const personas = probe.context.accepted_personas.map((p, i) =>
      synthPersona(p, projectId, briefId, i + 1),
    );

    const { drafts } = await generateQuestions({
      briefContent: probe.brief_content,
      acceptedHypotheses: hypotheses,
      acceptedPersonas: personas,
      projectId,
      briefId,
    });

    const judgable = drafts.filter((q) => q.variants.length === 3);
    if (judgable.length < probe.expects.min_questions) {
      reasons.push(
        `expected ≥${probe.expects.min_questions} questions with 3 variants, got ${judgable.length} — skipping judge`,
      );
      return result(probe, false, reasons, start);
    }

    const judgePicks = await askJudge(judgable);
    const generatorPicks = judgable.map((q) =>
      q.variants.findIndex((v) => v.is_recommended),
    );

    let agreements = 0;
    const disagreements: string[] = [];
    judgable.forEach((q, i) => {
      const judge = judgePicks[i];
      const gen = generatorPicks[i];
      if (gen < 0) {
        disagreements.push(
          `Q${i + 1} ("${truncate(q.target_construct, 50)}"): generator did not mark any variant as is_recommended`,
        );
      } else if (judge === gen) {
        agreements++;
      } else {
        disagreements.push(
          `Q${i + 1} ("${truncate(q.target_construct, 50)}"): generator picked variant[${gen}] (${q.variants[gen].variant_type}), judge picked variant[${judge}] (${q.variants[judge]?.variant_type ?? "?"})`,
        );
      }
    });

    const agreementRate = agreements / judgable.length;
    reasons.push(
      `agreement_rate ${(agreementRate * 100).toFixed(0)}% (${agreements}/${judgable.length})`,
    );

    if (agreementRate < probe.expects.min_agreement_rate) {
      reasons.push(
        `below threshold ${(probe.expects.min_agreement_rate * 100).toFixed(0)}%`,
      );
      for (const d of disagreements.slice(0, 5)) reasons.push(`  - ${d}`);
    }

    return result(probe, agreementRate >= probe.expects.min_agreement_rate, reasons, start);
  } catch (err) {
    return result(
      probe,
      false,
      [`runtime error: ${(err as Error).message}`],
      start,
    );
  }
}

async function askJudge(questions: QuestionDraft[]): Promise<number[]> {
  const blocks = questions
    .map((q, i) => {
      const variantText = q.variants
        .map(
          (v, j) =>
            `  Variant ${j} [${v.variant_type}]:\n    Statement: ${v.statement}\n    What it elicits: ${v.what_it_elicits}\n    Caveat: ${v.caveat}`,
        )
        .join("\n");
      return `# Question ${i + 1} (construct: ${q.target_construct})\n${variantText}`;
    })
    .join("\n\n---\n\n");

  const client = getAnthropic();
  const response = await withRetry(() =>
    client.messages.create({
      model: MODELS.sonnet,
      max_tokens: 400,
      system: JUDGE_SYSTEM,
      tools: [JUDGE_TOOL],
      tool_choice: { type: "tool", name: JUDGE_TOOL.name },
      messages: [
        {
          role: "user",
          content: `Pick the fatigue-default variant for each of ${questions.length} question(s). Return exactly ${questions.length} integers in order.\n\n${blocks}`,
        },
      ],
    }),
  );

  const block = response.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") return questions.map(() => -1);
  const data = block.input as { picks?: number[] };
  const picks = data.picks ?? [];
  while (picks.length < questions.length) picks.push(-1);
  return picks.slice(0, questions.length);
}

function result(
  probe: VariantJudgeFixture,
  passed: boolean,
  reasons: string[],
  start: number,
): ProbeResult {
  return {
    probe_id: probe.id,
    probe_type: "variant-judge",
    description: probe.description,
    passed,
    reasons,
    duration_ms: Date.now() - start,
  };
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
