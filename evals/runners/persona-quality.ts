import { generatePersonas } from "@/lib/rag/persona-generator";
import { loadProbesOfType } from "../lib/load-probes";
import type { PersonaQualityProbe, ProbeResult } from "../lib/types";

export async function runPersonaQuality(projectId: string): Promise<ProbeResult[]> {
  const probes = loadProbesOfType<PersonaQualityProbe>("persona-quality");
  const out: ProbeResult[] = [];
  for (const probe of probes) {
    out.push(await runOne(probe, projectId));
  }
  return out;
}

async function runOne(probe: PersonaQualityProbe, projectId: string): Promise<ProbeResult> {
  const start = Date.now();
  const reasons: string[] = [];

  try {
    const { drafts } = await generatePersonas({
      briefContent: probe.brief_content,
      projectId,
      acceptedHypotheses: [],
    });

    if (drafts.length < probe.expects.min_personas) {
      reasons.push(`expected at least ${probe.expects.min_personas} personas, got ${drafts.length}`);
    }

    if (probe.expects.all_grounded) {
      const ungrounded = drafts.filter((p) => p.supporting_chunk_ids.length === 0);
      if (ungrounded.length > 0) {
        reasons.push(`${ungrounded.length} persona(s) had no citations`);
      }
    }

    if (probe.expects.all_have_under_represents) {
      const missing = drafts.filter(
        (p) => !p.under_represents || p.under_represents.trim().length === 0,
      );
      if (missing.length > 0) {
        reasons.push(`${missing.length} persona(s) missing under_represents — the highest-value field`);
      }
    }

    if (probe.expects.min_under_represents_length > 0) {
      const tooShort = drafts.filter(
        (p) =>
          (p.under_represents ?? "").trim().length <
          probe.expects.min_under_represents_length,
      );
      if (tooShort.length > 0) {
        reasons.push(
          `${tooShort.length} persona(s) have under_represents below ${probe.expects.min_under_represents_length} chars (likely generic filler)`,
        );
      }
    }

    if (probe.expects.names_distinct) {
      const names = new Set<string>();
      let dupes = 0;
      for (const p of drafts) {
        const key = p.name.trim().toLowerCase();
        if (names.has(key)) dupes++;
        names.add(key);
      }
      if (dupes > 0) {
        reasons.push(`${dupes} duplicate persona name(s) — diversity rule violated`);
      }
    }

    return {
      probe_id: probe.id,
      probe_type: "persona-quality",
      description: probe.description,
      passed: reasons.length === 0,
      reasons,
      duration_ms: Date.now() - start,
    };
  } catch (err) {
    return {
      probe_id: probe.id,
      probe_type: "persona-quality",
      description: probe.description,
      passed: false,
      reasons: [`runtime error: ${(err as Error).message}`],
      duration_ms: Date.now() - start,
    };
  }
}
