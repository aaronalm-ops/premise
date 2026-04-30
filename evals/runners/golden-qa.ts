import { ask } from "@/lib/rag/pipeline";
import { loadProbesOfType } from "../lib/load-probes";
import type { GoldenQaProbe, ProbeResult } from "../lib/types";

export async function runGoldenQa(projectId: string): Promise<ProbeResult[]> {
  const probes = loadProbesOfType<GoldenQaProbe>("golden-qa");
  const out: ProbeResult[] = [];
  for (const probe of probes) {
    out.push(await runOne(probe, projectId));
  }
  return out;
}

async function runOne(probe: GoldenQaProbe, projectId: string): Promise<ProbeResult> {
  const start = Date.now();
  const reasons: string[] = [];

  try {
    const result = await ask(probe.question, projectId);
    const claims = result.answer.claims;

    if (claims.length < probe.expects.min_claims) {
      reasons.push(`expected at least ${probe.expects.min_claims} claims, got ${claims.length}`);
    }

    if (probe.expects.should_not_abstain && claims.length === 0) {
      reasons.push("bot abstained on a question the corpus can answer");
    }

    if (probe.expects.must_have_citations) {
      const uncited = claims.filter((c) => c.citation_ids.length === 0);
      if (uncited.length > 0) {
        reasons.push(`${uncited.length} claim(s) have no citations`);
      }
    }

    if (probe.expects.any_claim_contains_substring && probe.expects.any_claim_contains_substring.length > 0) {
      const lowered = claims.map((c) => c.text.toLowerCase());
      const hit = probe.expects.any_claim_contains_substring.some((s) =>
        lowered.some((claim) => claim.includes(s.toLowerCase())),
      );
      if (!hit) {
        reasons.push(`no claim contained any of: ${probe.expects.any_claim_contains_substring.join(" | ")}`);
      }
    }

    return {
      probe_id: probe.id,
      probe_type: "golden-qa",
      description: probe.description,
      passed: reasons.length === 0,
      reasons,
      duration_ms: Date.now() - start,
    };
  } catch (err) {
    return {
      probe_id: probe.id,
      probe_type: "golden-qa",
      description: probe.description,
      passed: false,
      reasons: [`runtime error: ${(err as Error).message}`],
      duration_ms: Date.now() - start,
    };
  }
}
