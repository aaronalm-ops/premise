// Hypothesis-judge probe runner (D-046, closes R-1).
//
// Layers a Sonnet rubric on top of the existing structural hypothesis-quality
// probe. Where hypothesis-quality asserts "fields exist + statements distinct
// + average length reasonable" (the floor), this probe scores 1-5 on:
//   - specificity: hypothesis names segment + behaviour + measure
//   - falsifiability: a wave's data would clearly confirm or reject it
//   - evidence_tightness: cited chunks directly support the hypothesis claim
//   - novelty: not a generic truism / not restatement of the brief
//   - distinctness_across_set: hypotheses test distinct claims, no near-dupes

import { generateHypotheses } from "@/lib/rag/hypothesis-generator";
import { loadProbesOfType } from "../lib/load-probes";
import {
  judgeWithSonnet,
  checkScores,
  type JudgeDimension,
} from "../lib/judge";
import type { HypothesisJudgeProbe, ProbeResult } from "../lib/types";
import type { Hypothesis, RetrievedChunk } from "@/lib/rag/types";

const DIMENSIONS: JudgeDimension[] = [
  {
    name: "specificity",
    description:
      "Every hypothesis names a specific segment, behaviour, and measurable construct. Vague hypotheses score low.",
  },
  {
    name: "falsifiability",
    description:
      "Each hypothesis could be clearly confirmed or rejected by a research wave. Unfalsifiable framings score low.",
  },
  {
    name: "evidence_tightness",
    description:
      "Cited chunks directly support the hypothesis claim. Tangential or topic-only citations score low.",
  },
  {
    name: "novelty",
    description:
      "Hypotheses go beyond restating the brief or stating obvious truisms. Generic hypotheses score low.",
  },
  {
    name: "distinctness_across_set",
    description:
      "Hypotheses test distinct claims (no near-duplicates with different wording). Overlapping sets score low.",
  },
];

const SYSTEM_RUBRIC = `You are a senior insights researcher reviewing a generated set of hypotheses for a market-research wave. You are stricter than the average reviewer because the system that generated these already passed structural checks — your job is to catch quality drift the structural checks can't see.`;

export async function runHypothesisJudge(
  projectId: string,
): Promise<ProbeResult[]> {
  const probes = loadProbesOfType<HypothesisJudgeProbe>("hypothesis-judge");
  const out: ProbeResult[] = [];
  for (const probe of probes) {
    out.push(await runOne(probe, projectId));
  }
  return out;
}

async function runOne(
  probe: HypothesisJudgeProbe,
  projectId: string,
): Promise<ProbeResult> {
  const start = Date.now();
  const reasons: string[] = [];

  try {
    const { drafts, retrieved_chunks } = await generateHypotheses({
      briefContent: probe.brief_content,
      projectId,
    });

    if (drafts.length < probe.expects.min_hypotheses) {
      reasons.push(
        `expected ≥${probe.expects.min_hypotheses} hypotheses, got ${drafts.length} — skipping judge`,
      );
      return result(probe, false, reasons, start);
    }

    const payload = renderPayload(drafts, retrieved_chunks);
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
  drafts: Array<Hypothesis | { statement: string; assumptions: string[]; expected_direction: string; confirmation_criteria: string; supporting_chunk_ids: string[]; contradicting_chunk_ids: string[]; priority: number }>,
  chunks: RetrievedChunk[],
): string {
  const chunkById = new Map(chunks.map((c) => [c.id, c]));

  const blocks = drafts.map((h, i) => {
    const supporting = h.supporting_chunk_ids
      .map((id) => chunkById.get(id))
      .filter((x): x is RetrievedChunk => Boolean(x))
      .map((c) => `[${c.id}] ${truncate(c.content, 240)}`)
      .join("\n");
    const contradicting = h.contradicting_chunk_ids
      .map((id) => chunkById.get(id))
      .filter((x): x is RetrievedChunk => Boolean(x))
      .map((c) => `[${c.id}] ${truncate(c.content, 240)}`)
      .join("\n");

    return [
      `# Hypothesis ${i + 1} (priority ${h.priority})`,
      `Statement: ${h.statement}`,
      `Expected direction: ${h.expected_direction}`,
      `Confirmation criteria: ${h.confirmation_criteria}`,
      `Assumptions: ${(h.assumptions ?? []).join("; ") || "(none)"}`,
      supporting ? `Supporting chunks:\n${supporting}` : "Supporting chunks: (none)",
      contradicting ? `Contradicting chunks:\n${contradicting}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  });

  return `Score the following ${drafts.length} hypotheses generated for a market-research brief.\n\n${blocks.join("\n\n---\n\n")}`;
}

function result(
  probe: HypothesisJudgeProbe,
  passed: boolean,
  reasons: string[],
  start: number,
): ProbeResult {
  return {
    probe_id: probe.id,
    probe_type: "hypothesis-judge",
    description: probe.description,
    passed,
    reasons,
    duration_ms: Date.now() - start,
  };
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
