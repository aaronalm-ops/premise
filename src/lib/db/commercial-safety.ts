// D-045 — Commercial-safety helpers for the public corpus.
//
// The guardrail prevents commercially-restricted content (CC-NC,
// unverified-licence, permission-licensed-unverified) from being surfaced
// when Premise is running in commercial mode. The "commercial mode" flag
// is a single env var — set it at the moment of commercial pivot, and the
// retrieval layer (and any audit script) automatically excludes the
// at-risk content.
//
// Same pattern as D-016's SQL-boundary confidentiality: don't trust
// application code to remember; bake the boundary into the DB +
// gate-keeper layer.

import { getSupabaseServer } from "@/lib/db/supabase";

const COMMERCIAL_MODE_ENV_VAR = "PREMISE_COMMERCIAL_MODE";

/**
 * True when the deployment is in commercial mode and NC / unverified-licence
 * content must be excluded from retrieval. Toggled via PREMISE_COMMERCIAL_MODE
 * (set to "true" / "1" / "yes" — anything else is treated as false).
 *
 * Default: false. This means existing portfolio-phase deployments are
 * unaffected — every document remains retrievable until you explicitly flip
 * the flag at commercial pivot.
 */
export function isCommercialModeActive(): boolean {
  const raw = process.env[COMMERCIAL_MODE_ENV_VAR]?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

/**
 * Fetches the set of document IDs that the DB marks
 * commercial_use_blocked=true. Used by the retrieval-time filter and the
 * audit script. Returns a Set so membership checks are O(1).
 */
export async function getCommerciallyBlockedDocumentIds(): Promise<Set<string>> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("documents")
    .select("id")
    .eq("commercial_use_blocked", true);
  if (error) {
    throw new Error(`getCommerciallyBlockedDocumentIds: ${error.message}`);
  }
  return new Set((data ?? []).map((r) => r.id as string));
}

export type CorpusSafetyPartition = {
  /** Documents whose licence permits commercial reuse with no further action. */
  safe: Array<{ id: string; title: string; licence: string | null }>;
  /** Documents that the DB blocks for commercial use right now. */
  blocked: Array<{
    id: string;
    title: string;
    licence: string | null;
    reason: string;
  }>;
  /** Total document count in the public library. */
  totalCount: number;
};

/**
 * Lists every document in the public library, partitioned by commercial
 * safety. Powers the audit script (`npm run audit-public-corpus`).
 */
export async function partitionPublicLibraryBySafety(
  publicProjectIds: string[],
): Promise<CorpusSafetyPartition> {
  if (publicProjectIds.length === 0) {
    return { safe: [], blocked: [], totalCount: 0 };
  }

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("documents")
    .select("id, title, licence, commercial_use_blocked")
    .in("project_id", publicProjectIds)
    .order("title", { ascending: true });

  if (error) {
    throw new Error(`partitionPublicLibraryBySafety: ${error.message}`);
  }

  const rows = (data ?? []) as Array<{
    id: string;
    title: string;
    licence: string | null;
    commercial_use_blocked: boolean;
  }>;

  const safe: CorpusSafetyPartition["safe"] = [];
  const blocked: CorpusSafetyPartition["blocked"] = [];

  for (const row of rows) {
    if (row.commercial_use_blocked) {
      blocked.push({
        id: row.id,
        title: row.title,
        licence: row.licence,
        reason: reasonFor(row.licence),
      });
    } else {
      safe.push({ id: row.id, title: row.title, licence: row.licence });
    }
  }

  return { safe, blocked, totalCount: rows.length };
}

function reasonFor(licence: string | null): string {
  if (licence === null) return "no licence recorded";
  if (licence === "unknown") return "explicitly marked unverified";
  if (licence === "cc-by-nc-4.0") return "Non-Commercial CC licence";
  if (licence === "cc-by-nc-sa-4.0") return "Non-Commercial + Share-Alike CC licence";
  if (licence === "permission-licensed")
    return "publisher requires explicit permission — verify granted scope before unblocking";
  return `unknown blocking reason (licence: ${licence})`;
}
