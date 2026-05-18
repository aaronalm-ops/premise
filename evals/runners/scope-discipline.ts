// D-049: scope-discipline probe runner.
//
// Generates hypotheses from a region/segment/horizon-neutral brief and checks
// that no statement contains forbidden substrings (the scope words that
// should NOT leak from the corpus). Also checks the audit-trail field
// scope_inherited_from — every draft should self-report 'brief' or
// 'clarifier' when the brief is the only authority.
//
// Pairs with the structural hypothesis-quality probe: that one checks fields
// exist; this one checks scope hasn't leaked.

import { generateHypotheses } from "@/lib/rag/hypothesis-generator";
import { loadProbesOfType } from "../lib/load-probes";
import type { ProbeResult, ScopeDisciplineProbe } from "../lib/types";

export async function runScopeDiscipline(
  projectId: string,
): Promise<ProbeResult[]> {
  const probes = loadProbesOfType<ScopeDisciplineProbe>("scope-discipline");
  const out: ProbeResult[] = [];
  for (const probe of probes) {
    out.push(await runOne(probe, projectId));
  }
  return out;
}

async function runOne(
  probe: ScopeDisciplineProbe,
  projectId: string,
): Promise<ProbeResult> {
  const start = Date.now();
  const reasons: string[] = [];

  try {
    const { drafts } = await generateHypotheses({
      briefContent: probe.brief_content,
      projectId,
    });

    if (drafts.length < probe.expects.min_hypotheses) {
      reasons.push(
        `expected at least ${probe.expects.min_hypotheses} hypotheses, got ${drafts.length}`,
      );
    }

    const lowered = probe.expects.forbidden_substrings_in_statement.map((s) =>
      s.toLowerCase(),
    );
    for (const h of drafts) {
      const statement = h.statement.toLowerCase();
      const leaked = lowered.filter((w) => statement.includes(w));
      if (leaked.length > 0) {
        reasons.push(
          `hypothesis "${h.statement.slice(0, 80)}…" contains forbidden scope substring(s): ${leaked.join(", ")}`,
        );
      }
    }

    if (probe.expects.all_scope_from_brief_or_clarifier) {
      const leaks = drafts.filter(
        (h) =>
          h.scope_inherited_from !== "brief" &&
          h.scope_inherited_from !== "clarifier",
      );
      if (leaks.length > 0) {
        reasons.push(
          `${leaks.length} hypothesis(es) self-reported scope_inherited_from outside brief/clarifier: ${leaks
            .map((h) => h.scope_inherited_from)
            .join(", ")}`,
        );
      }
    }

    return {
      probe_id: probe.id,
      probe_type: "scope-discipline",
      description: probe.description,
      passed: reasons.length === 0,
      reasons,
      duration_ms: Date.now() - start,
    };
  } catch (err) {
    return {
      probe_id: probe.id,
      probe_type: "scope-discipline",
      description: probe.description,
      passed: false,
      reasons: [`runtime error: ${(err as Error).message}`],
      duration_ms: Date.now() - start,
    };
  }
}
