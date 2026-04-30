// Confidentiality probes verify D-016: cross-project retrieval is impossible.
// We query project A for content distinctive to project B and verify zero
// chunks from B surface in the result.

import { retrieve } from "@/lib/rag/retrieval";
import { getSupabaseServer } from "@/lib/db/supabase";
import { loadProbesOfType } from "../lib/load-probes";
import type {
  ConfidentialityProbe,
  EvalConfig,
  ProbeResult,
} from "../lib/types";

const NONEXISTENT_PROJECT_ID = "00000000-0000-0000-0000-000000000000";

export async function runConfidentiality(config: EvalConfig): Promise<ProbeResult[]> {
  const probes = loadProbesOfType<ConfidentialityProbe>("confidentiality");
  const out: ProbeResult[] = [];
  for (const probe of probes) {
    out.push(await runOne(probe, config));
  }
  return out;
}

async function runOne(probe: ConfidentialityProbe, config: EvalConfig): Promise<ProbeResult> {
  const start = Date.now();
  const reasons: string[] = [];

  const targetProjectId =
    probe.query_against === "A"
      ? config.project_a_id
      : probe.query_against === "B"
        ? config.project_b_id
        : NONEXISTENT_PROJECT_ID;

  const otherProjectId =
    probe.query_against === "A"
      ? config.project_b_id
      : probe.query_against === "B"
        ? config.project_a_id
        : "(any other)";

  try {
    const chunks = await retrieve(probe.question, targetProjectId, 8);

    if (probe.query_against === "nonexistent") {
      if (chunks.length > 0) {
        reasons.push(
          `expected zero chunks for nonexistent project, got ${chunks.length}`,
        );
      }
    } else if (probe.expects.no_chunks_from_other_project && chunks.length > 0) {
      // Verify each returned chunk's project_id matches targetProjectId
      const supabase = getSupabaseServer();
      const ids = chunks.map((c) => c.id);
      const { data, error } = await supabase
        .from("chunks")
        .select("id, project_id")
        .in("id", ids);

      if (error) {
        reasons.push(`could not verify chunk project_ids: ${error.message}`);
      } else {
        const violators = (data ?? []).filter((c) => c.project_id !== targetProjectId);
        if (violators.length > 0) {
          reasons.push(
            `${violators.length} chunk(s) from project ${otherProjectId} surfaced when querying project ${targetProjectId} — D-016 BREACH`,
          );
        }
      }
    }

    if (probe.expects.forbidden_substring_in_any_chunk && probe.expects.forbidden_substring_in_any_chunk.length > 0) {
      for (const forbidden of probe.expects.forbidden_substring_in_any_chunk) {
        const offenders = chunks.filter((c) =>
          c.content.toLowerCase().includes(forbidden.toLowerCase()),
        );
        if (offenders.length > 0) {
          reasons.push(
            `forbidden substring "${forbidden}" appeared in ${offenders.length} retrieved chunk(s) — confidentiality boundary leaked`,
          );
        }
      }
    }

    return {
      probe_id: probe.id,
      probe_type: "confidentiality",
      description: probe.description,
      passed: reasons.length === 0,
      reasons,
      duration_ms: Date.now() - start,
    };
  } catch (err) {
    return {
      probe_id: probe.id,
      probe_type: "confidentiality",
      description: probe.description,
      passed: false,
      reasons: [`runtime error: ${(err as Error).message}`],
      duration_ms: Date.now() - start,
    };
  }
}
