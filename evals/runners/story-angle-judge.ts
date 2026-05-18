// Story-angle-judge probe runner (D-046, closes E-1).
//
// Story angles (D-036, story-gen v3 per D-039) are the deck-shaped outputs.
// Each angle has: title + target_audience + lede + beats + supporting
// hypotheses + omits. Rubric:
//   - audience_distinctness_across_set: each angle names a different primary
//     audience (taskforce 7b principle baked into D-036 footnote 1)
//   - lede_sharpness: lede is one specific sentence, not a generic teaser
//   - evidence_chain_coherence: cited hypotheses + patterns actually support
//     the beats
//   - omits_honesty: omits names a real omission tied to the angle's framing,
//     not a boilerplate disclaimer

import { generateStoryAngles } from "@/lib/rag/story-generator";
import { loadProbesOfType } from "../lib/load-probes";
import {
  judgeWithSonnet,
  checkScores,
  type JudgeDimension,
} from "../lib/judge";
import type { StoryAngleJudgeProbe, ProbeResult } from "../lib/types";
import type { StoryAngleDraft } from "@/lib/rag/types";
import {
  synthHypothesis,
  synthPersona,
  synthAnalysis,
  synthRecommendation,
  makeSyntheticBriefId,
  type SynthHypothesis,
  type SynthPersona,
  type SynthAnalysis,
  type SynthRecommendation,
} from "../lib/synth";

type StoryAngleJudgeFixture = StoryAngleJudgeProbe & {
  context: {
    accepted_hypotheses: SynthHypothesis[];
    accepted_personas: SynthPersona[];
    analysis: SynthAnalysis | null;
    accepted_recommendation: SynthRecommendation | null;
  };
};

const DIMENSIONS: JudgeDimension[] = [
  {
    name: "audience_distinctness_across_set",
    description:
      "Each angle names a different primary audience. Multiple angles aimed at the same audience score low (per D-036 footnote 1).",
  },
  {
    name: "lede_sharpness",
    description:
      "Each lede is one specific sentence with a named tension or surprise. Generic teasers ('here's what we learned') score low.",
  },
  {
    name: "evidence_chain_coherence",
    description:
      "Cited supporting hypotheses + emergent patterns actually back the beats. Loosely-coupled citations score low.",
  },
  {
    name: "omits_honesty",
    description:
      "Omits names a real omission tied to the angle's framing (audience excluded, alternative narrative dropped). Boilerplate or 'limitations of the study' score low.",
  },
];

const SYSTEM_RUBRIC = `You are an experienced research storyteller and senior editor reviewing a set of story angles drafted from a research wave. The 'omits' field is a positioning disclosure, not a confession (D-038) — score it on whether it honestly names what each angle leaves out, not on whether it sounds humble.`;

export async function runStoryAngleJudge(
  projectId: string,
): Promise<ProbeResult[]> {
  const probes = loadProbesOfType<StoryAngleJudgeFixture>("story-angle-judge");
  const out: ProbeResult[] = [];
  for (const probe of probes) {
    out.push(await runOne(probe, projectId));
  }
  return out;
}

async function runOne(
  probe: StoryAngleJudgeFixture,
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
    const recommendation = synthRecommendation(
      probe.context.accepted_recommendation,
      hypotheses.map((h) => h.id),
      projectId,
      briefId,
    );

    const { drafts } = await generateStoryAngles({
      briefContent: probe.brief_content,
      acceptedHypotheses: hypotheses,
      acceptedPersonas: personas,
      analysis,
      acceptedRecommendation: recommendation,
      projectId,
      briefId,
    });

    if (drafts.length < probe.expects.min_angles) {
      reasons.push(
        `expected ≥${probe.expects.min_angles} angles, got ${drafts.length} — skipping judge`,
      );
      return result(probe, false, reasons, start);
    }

    const payload = renderPayload(drafts, probe.brief_content, hypotheses);
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
  drafts: StoryAngleDraft[],
  briefContent: string,
  hypotheses: Array<{ id: string; statement: string }>,
): string {
  const hypoMap = new Map(hypotheses.map((h) => [h.id, h.statement]));

  const blocks = drafts.map((a, i) => {
    const cited = a.supporting_hypothesis_ids
      .map((id) => hypoMap.get(id))
      .filter(Boolean)
      .map((s, j) => `H${j + 1}: ${s}`)
      .join("\n");
    return [
      `# Angle ${i + 1}: "${a.title}" (priority ${a.priority})`,
      `Target audience: ${a.target_audience}`,
      `Lede: ${a.lede}`,
      `Beats:\n${a.beats.map((b, k) => `  ${k + 1}. ${b}`).join("\n")}`,
      cited ? `Supporting hypotheses:\n${cited}` : "Supporting hypotheses: (none cited)",
      a.supporting_emergent_patterns?.length
        ? `Supporting patterns: ${a.supporting_emergent_patterns.join("; ")}`
        : "",
      `Omits: ${a.omits}`,
    ]
      .filter(Boolean)
      .join("\n");
  });

  return `Score the following ${drafts.length} story angles drafted for a research brief.\n\n# Brief\n${briefContent}\n\n${blocks.join("\n\n---\n\n")}`;
}

function result(
  probe: StoryAngleJudgeFixture,
  passed: boolean,
  reasons: string[],
  start: number,
): ProbeResult {
  return {
    probe_id: probe.id,
    probe_type: "story-angle-judge",
    description: probe.description,
    passed,
    reasons,
    duration_ms: Date.now() - start,
  };
}
