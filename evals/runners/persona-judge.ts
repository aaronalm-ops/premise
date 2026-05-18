// Persona-judge probe runner (D-046, closes R-2).
//
// Layers a Sonnet rubric on persona-quality. Dimensions:
//   - behavioural_specificity: behavioural profile names concrete actions,
//     not generic descriptors
//   - distinctness_across_set: each persona occupies meaningfully different
//     space in the segmentation; no near-duplicates
//   - under_represents_quality: the under_represents field names a specific
//     audience the set misses (the load-bearing field per D-019)
//   - grounded_to_corpus: persona descriptions reflect what the cited chunks
//     actually say, not a generic stereotype layered on top

import { generatePersonas } from "@/lib/rag/persona-generator";
import { loadProbesOfType } from "../lib/load-probes";
import {
  judgeWithSonnet,
  checkScores,
  type JudgeDimension,
} from "../lib/judge";
import type { PersonaJudgeProbe, ProbeResult } from "../lib/types";
import type { PersonaDraft, RetrievedChunk } from "@/lib/rag/types";

const DIMENSIONS: JudgeDimension[] = [
  {
    name: "behavioural_specificity",
    description:
      "Persona behavioural profile names concrete actions, channels, or decisions. Generic adjectives score low.",
  },
  {
    name: "distinctness_across_set",
    description:
      "Personas occupy meaningfully different positions in the segmentation. Near-duplicates with different names score low.",
  },
  {
    name: "under_represents_quality",
    description:
      "The under_represents field names a specific audience the set misses (e.g. 'rural Gen-Z, single-income households'). Bot-flavoured non-answers ('various other groups') score low.",
  },
  {
    name: "grounded_to_corpus",
    description:
      "Persona profile reflects what the cited chunks actually say. Stereotypes layered on weak citations score low.",
  },
];

const SYSTEM_RUBRIC = `You are a senior insights researcher reviewing a generated persona set. The under_represents field is non-negotiable per the product spec — a persona set that hides its omissions is worse than one that names them. Score honestly.`;

export async function runPersonaJudge(
  projectId: string,
): Promise<ProbeResult[]> {
  const probes = loadProbesOfType<PersonaJudgeProbe>("persona-judge");
  const out: ProbeResult[] = [];
  for (const probe of probes) {
    out.push(await runOne(probe, projectId));
  }
  return out;
}

async function runOne(
  probe: PersonaJudgeProbe,
  projectId: string,
): Promise<ProbeResult> {
  const start = Date.now();
  const reasons: string[] = [];

  try {
    const { drafts, retrieved_chunks } = await generatePersonas({
      briefContent: probe.brief_content,
      projectId,
      acceptedHypotheses: [],
    });

    if (drafts.length < probe.expects.min_personas) {
      reasons.push(
        `expected ≥${probe.expects.min_personas} personas, got ${drafts.length} — skipping judge`,
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
  drafts: PersonaDraft[],
  chunks: RetrievedChunk[],
): string {
  const chunkById = new Map(chunks.map((c) => [c.id, c]));

  const blocks = drafts.map((p, i) => {
    const cited = p.supporting_chunk_ids
      .map((id) => chunkById.get(id))
      .filter((x): x is RetrievedChunk => Boolean(x))
      .map((c) => `[${c.id}] ${truncate(c.content, 240)}`)
      .join("\n");

    return [
      `# Persona ${i + 1}: ${p.name} (priority ${p.priority})`,
      `Description: ${p.description}`,
      `Demographic: ${p.demographic_profile}`,
      `Behavioural: ${p.behavioural_profile}`,
      `Under-represents: ${p.under_represents}`,
      `Assumptions: ${(p.assumptions ?? []).join("; ") || "(none)"}`,
      cited ? `Cited chunks:\n${cited}` : "Cited chunks: (none)",
    ].join("\n");
  });

  return `Score the following ${drafts.length} personas generated for a market-research brief.\n\n${blocks.join("\n\n---\n\n")}`;
}

function result(
  probe: PersonaJudgeProbe,
  passed: boolean,
  reasons: string[],
  start: number,
): ProbeResult {
  return {
    probe_id: probe.id,
    probe_type: "persona-judge",
    description: probe.description,
    passed,
    reasons,
    duration_ms: Date.now() - start,
  };
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
