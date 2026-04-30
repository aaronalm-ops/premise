import { ask } from "@/lib/rag/pipeline";
import { loadProbesOfType } from "../lib/load-probes";
import type { HallucinationProbe, ProbeResult } from "../lib/types";

export async function runHallucination(projectId: string): Promise<ProbeResult[]> {
  const probes = loadProbesOfType<HallucinationProbe>("hallucination");
  const out: ProbeResult[] = [];
  for (const probe of probes) {
    out.push(await runOne(probe, projectId));
  }
  return out;
}

async function runOne(probe: HallucinationProbe, projectId: string): Promise<ProbeResult> {
  const start = Date.now();
  const reasons: string[] = [];

  try {
    const result = await ask(probe.question, projectId);
    const claims = result.answer.claims;

    if (probe.expects.abstain_or_cite) {
      // Two acceptable behaviours: full abstention, or every claim has citations.
      if (claims.length === 0) {
        // abstention path — pass
      } else {
        const uncited = claims.filter((c) => c.citation_ids.length === 0);
        if (uncited.length > 0) {
          reasons.push(
            `${uncited.length} uncited claim(s) on a hallucination-tempting question`,
          );
        }
        const validIds = new Set(result.retrieved_chunks.map((c) => c.id));
        const badCites = claims.filter((c) =>
          c.citation_ids.some((id) => !validIds.has(id)),
        );
        if (badCites.length > 0) {
          reasons.push(
            `${badCites.length} claim(s) cite chunk IDs that were not retrieved`,
          );
        }
      }
    }

    if (probe.expects.forbidden_substring_in_claims && probe.expects.forbidden_substring_in_claims.length > 0) {
      const lowered = claims.map((c) => c.text.toLowerCase());
      for (const forbidden of probe.expects.forbidden_substring_in_claims) {
        if (lowered.some((c) => c.includes(forbidden.toLowerCase()))) {
          reasons.push(`forbidden substring appeared in a claim: "${forbidden}"`);
        }
      }
    }

    return {
      probe_id: probe.id,
      probe_type: "hallucination",
      description: probe.description,
      passed: reasons.length === 0,
      reasons,
      duration_ms: Date.now() - start,
    };
  } catch (err) {
    return {
      probe_id: probe.id,
      probe_type: "hallucination",
      description: probe.description,
      passed: false,
      reasons: [`runtime error: ${(err as Error).message}`],
      duration_ms: Date.now() - start,
    };
  }
}
