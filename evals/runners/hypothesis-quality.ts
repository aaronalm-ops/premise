import { generateHypotheses } from "@/lib/rag/hypothesis-generator";
import { loadProbesOfType } from "../lib/load-probes";
import type { HypothesisQualityProbe, ProbeResult } from "../lib/types";

export async function runHypothesisQuality(projectId: string): Promise<ProbeResult[]> {
  const probes = loadProbesOfType<HypothesisQualityProbe>("hypothesis-quality");
  const out: ProbeResult[] = [];
  for (const probe of probes) {
    out.push(await runOne(probe, projectId));
  }
  return out;
}

async function runOne(probe: HypothesisQualityProbe, projectId: string): Promise<ProbeResult> {
  const start = Date.now();
  const reasons: string[] = [];

  try {
    const { drafts } = await generateHypotheses({
      briefContent: probe.brief_content,
      projectId,
    });

    if (drafts.length < probe.expects.min_hypotheses) {
      reasons.push(`expected at least ${probe.expects.min_hypotheses} hypotheses, got ${drafts.length}`);
    }

    if (probe.expects.all_grounded) {
      const ungrounded = drafts.filter(
        (h) =>
          h.supporting_chunk_ids.length === 0 &&
          h.contradicting_chunk_ids.length === 0,
      );
      if (ungrounded.length > 0) {
        reasons.push(`${ungrounded.length} hypothesis(es) had no citations — schema enforcement leak`);
      }
    }

    if (probe.expects.all_have_expected_direction) {
      const missing = drafts.filter(
        (h) => !h.expected_direction || h.expected_direction.trim().length < 8,
      );
      if (missing.length > 0) {
        reasons.push(`${missing.length} hypothesis(es) missing expected_direction`);
      }
    }

    if (probe.expects.all_have_confirmation_criteria) {
      const missing = drafts.filter(
        (h) => !h.confirmation_criteria || h.confirmation_criteria.trim().length < 8,
      );
      if (missing.length > 0) {
        reasons.push(`${missing.length} hypothesis(es) missing confirmation_criteria`);
      }
    }

    if (probe.expects.statements_distinct) {
      const seen = new Set<string>();
      let dupes = 0;
      for (const h of drafts) {
        const key = h.statement.trim().toLowerCase();
        if (seen.has(key)) dupes++;
        seen.add(key);
      }
      if (dupes > 0) {
        reasons.push(`${dupes} duplicate hypothesis statement(s) — diversity rule violated`);
      }
    }

    if (probe.expects.min_average_statement_length > 0 && drafts.length > 0) {
      const avg = drafts.reduce((s, h) => s + h.statement.length, 0) / drafts.length;
      if (avg < probe.expects.min_average_statement_length) {
        reasons.push(
          `average statement length ${avg.toFixed(0)} chars is below threshold ${probe.expects.min_average_statement_length} (likely too vague / generic)`,
        );
      }
    }

    return {
      probe_id: probe.id,
      probe_type: "hypothesis-quality",
      description: probe.description,
      passed: reasons.length === 0,
      reasons,
      duration_ms: Date.now() - start,
    };
  } catch (err) {
    return {
      probe_id: probe.id,
      probe_type: "hypothesis-quality",
      description: probe.description,
      passed: false,
      reasons: [`runtime error: ${(err as Error).message}`],
      duration_ms: Date.now() - start,
    };
  }
}
