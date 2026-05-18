// Recommendation-judge probe runner (D-046, closes E-2).
//
// The recommendation artefact (D-039) is the C-suite-shaped output —
// causal insight + specific action + calibrated confidence + caveats.
// This probe scores it against a rubric:
//   - causal_insight_clarity: insight names a cause-effect, not a summary
//   - action_specificity: recommended_action is concrete enough for a
//     decision-maker to act on
//   - calibration_honesty: confidence (high/medium/low) matches the
//     evidence-chain strength (verdicts + emergent patterns)
//   - caveat_completeness: caveats include the load-bearing assumptions
//     that could flip the recommendation
//
// The probe fixture inlines synthesised upstream context (hypotheses,
// personas, optional analysis) — the runner casts those into typed
// shapes via evals/lib/synth.ts and calls the real generator.

import { generateRecommendations } from "@/lib/rag/recommendation-generator";
import { loadProbesOfType } from "../lib/load-probes";
import {
  judgeWithSonnet,
  checkScores,
  type JudgeDimension,
} from "../lib/judge";
import type { RecommendationJudgeProbe, ProbeResult } from "../lib/types";
import type { RecommendationDraft } from "@/lib/rag/types";
import {
  synthHypothesis,
  synthPersona,
  synthAnalysis,
  makeSyntheticBriefId,
  type SynthHypothesis,
  type SynthPersona,
  type SynthAnalysis,
} from "../lib/synth";

// Probe fixtures extend the base shape with inline upstream context.
type RecommendationJudgeFixture = RecommendationJudgeProbe & {
  context: {
    accepted_hypotheses: SynthHypothesis[];
    accepted_personas: SynthPersona[];
    analysis: SynthAnalysis | null;
  };
};

const DIMENSIONS: JudgeDimension[] = [
  {
    name: "causal_insight_clarity",
    description:
      "Insight names a specific cause-effect (X drives Y, or Y is constrained by Z). Pure summary or correlation scores low.",
  },
  {
    name: "action_specificity",
    description:
      "Recommended action is concrete enough for a decision-maker to act on (verb + object + measurable target). 'Consider further research' scores low.",
  },
  {
    name: "calibration_honesty",
    description:
      "Confidence (high/medium/low) matches the evidence-chain strength. High confidence on thin or mixed evidence scores low; appropriately humble framings score high.",
  },
  {
    name: "caveat_completeness",
    description:
      "Caveats include the load-bearing assumptions that could flip the recommendation (segment scope, time window, missing audience). Boilerplate caveats score low.",
  },
];

const SYSTEM_RUBRIC = `You are an experienced AI product manager and senior insights consultant reading a recommendation written for a C-suite buyer. You are stricter than the average reviewer because the system that generated this artefact already passed structural checks. The recommendation must earn trust on its own merits — calibration honesty is non-negotiable.`;

export async function runRecommendationJudge(
  projectId: string,
): Promise<ProbeResult[]> {
  const probes =
    loadProbesOfType<RecommendationJudgeFixture>("recommendation-judge");
  const out: ProbeResult[] = [];
  for (const probe of probes) {
    out.push(await runOne(probe, projectId));
  }
  return out;
}

async function runOne(
  probe: RecommendationJudgeFixture,
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
    const analysis = synthAnalysis(
      probe.context.analysis,
      hypotheses,
      projectId,
      briefId,
    );

    const { drafts } = await generateRecommendations({
      briefContent: probe.brief_content,
      acceptedHypotheses: hypotheses,
      acceptedPersonas: personas,
      analysis,
      projectId,
      briefId,
    });

    if (drafts.length < probe.expects.min_recommendations) {
      reasons.push(
        `expected ≥${probe.expects.min_recommendations} recommendations, got ${drafts.length} — skipping judge`,
      );
      return result(probe, false, reasons, start);
    }

    const payload = renderPayload(drafts, probe.brief_content);
    const { scores, notes } = await judgeWithSonnet({
      dimensions: DIMENSIONS,
      systemRubric: SYSTEM_RUBRIC,
      payload,
    });

    const issues = checkScores(
      scores,
      probe.expects.min_score,
      probe.expects.min_average_score,
    );
    if (issues.length > 0) {
      for (const i of issues) reasons.push(i);
      if (notes) reasons.push(`judge notes: ${notes}`);
    }
    reasons.push(
      `scores: ${Object.entries(scores)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ")}`,
    );

    return result(probe, issues.length === 0, reasons, start);
  } catch (err) {
    return result(
      probe,
      false,
      [`runtime error: ${(err as Error).message}`],
      start,
    );
  }
}

function renderPayload(
  drafts: RecommendationDraft[],
  briefContent: string,
): string {
  const blocks = drafts.map((r, i) =>
    [
      `# Recommendation ${i + 1}`,
      `Insight: ${r.insight}`,
      `Recommended action: ${r.recommended_action}`,
      `Confidence: ${r.confidence}`,
      `Caveats: ${r.caveats.join("; ") || "(none)"}`,
    ].join("\n"),
  );
  return `Score the following ${drafts.length} recommendation(s) for a research brief.\n\n# Brief\n${briefContent}\n\n${blocks.join("\n\n---\n\n")}`;
}

function result(
  probe: RecommendationJudgeFixture,
  passed: boolean,
  reasons: string[],
  start: number,
): ProbeResult {
  return {
    probe_id: probe.id,
    probe_type: "recommendation-judge",
    description: probe.description,
    passed,
    reasons,
    duration_ms: Date.now() - start,
  };
}
