import { ask } from "@/lib/rag/pipeline";
import { loadProbesOfType } from "../lib/load-probes";
import type { AbstentionProbe, ProbeResult } from "../lib/types";

export async function runAbstention(projectId: string): Promise<ProbeResult[]> {
  const probes = loadProbesOfType<AbstentionProbe>("abstention");
  const out: ProbeResult[] = [];
  for (const probe of probes) {
    out.push(await runOne(probe, projectId));
  }
  return out;
}

async function runOne(probe: AbstentionProbe, projectId: string): Promise<ProbeResult> {
  const start = Date.now();
  const reasons: string[] = [];

  try {
    const result = await ask(probe.question, projectId);

    if (result.answer.claims.length !== probe.expects.claims_count) {
      reasons.push(
        `expected exactly ${probe.expects.claims_count} claims, got ${result.answer.claims.length} — bot fabricated when it should have abstained`,
      );
    }

    if (
      result.answer.unanswered_aspects.length < probe.expects.unanswered_aspects_min
    ) {
      reasons.push(
        `expected at least ${probe.expects.unanswered_aspects_min} unanswered_aspects, got ${result.answer.unanswered_aspects.length}`,
      );
    }

    return {
      probe_id: probe.id,
      probe_type: "abstention",
      description: probe.description,
      passed: reasons.length === 0,
      reasons,
      duration_ms: Date.now() - start,
    };
  } catch (err) {
    return {
      probe_id: probe.id,
      probe_type: "abstention",
      description: probe.description,
      passed: false,
      reasons: [`runtime error: ${(err as Error).message}`],
      duration_ms: Date.now() - start,
    };
  }
}
