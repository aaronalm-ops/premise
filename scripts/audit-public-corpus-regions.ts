// Premise — Public-corpus regional-balance audit (D-049 follow-up).
//
// Usage: npm run audit-public-corpus-regions
//
// Lists every document in the public library project(s) grouped by the
// `geography` metadata column (D-044). A healthy public library is
// approximately global — no single region accounts for more than ~30% of
// docs in any topic cluster. The D-049 scope-detection clarifier assumes
// the public library is global-by-curation; this script is the audit that
// makes sure that assumption holds.
//
// Output:
//   * Counts per geography bucket (with percentage of total)
//   * Counts per (geography × source_type) cross-tab
//   * Docs marked with NULL geography (curation gap — flag for editing)
//   * Recommendation: if any region exceeds 30% share, list specific docs
//     to balance toward.

import { getSupabaseServer } from "@/lib/db/supabase";
import { getPublicLibraryIds } from "@/lib/db/projects";

const REGIONAL_SHARE_THRESHOLD = 0.3;

type Row = {
  id: string;
  title: string;
  geography: string | null;
  source_type: string | null;
  publication_year: number | null;
};

async function main(): Promise<void> {
  console.log("Premise — public-corpus regional-balance audit\n");

  const publicIds = await getPublicLibraryIds();
  if (publicIds.length === 0) {
    console.log("No public library projects found.");
    return;
  }

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("documents")
    .select("id, title, geography, source_type, publication_year")
    .in("project_id", publicIds)
    .order("title");
  if (error) {
    console.error(`Could not list public-library documents: ${error.message}`);
    process.exit(1);
  }

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) {
    console.log("No documents in public-library projects.");
    return;
  }

  console.log(`Total documents: ${rows.length}\n`);

  // Geography breakdown.
  const byGeography = new Map<string, Row[]>();
  for (const row of rows) {
    const key = row.geography?.trim() || "(no geography set)";
    const list = byGeography.get(key) ?? [];
    list.push(row);
    byGeography.set(key, list);
  }

  const sorted = Array.from(byGeography.entries()).sort(
    (a, b) => b[1].length - a[1].length,
  );

  console.log("Geography distribution:");
  for (const [geo, docs] of sorted) {
    const share = docs.length / rows.length;
    const flag = share > REGIONAL_SHARE_THRESHOLD ? " ⚠" : "";
    console.log(
      `  ${docs.length.toString().padStart(3, " ")}  ${(share * 100).toFixed(1)}%${flag}  ${geo}`,
    );
  }

  // Recommendation.
  console.log("");
  const dominant = sorted[0];
  if (
    dominant &&
    dominant[0] !== "(no geography set)" &&
    dominant[1].length / rows.length > REGIONAL_SHARE_THRESHOLD
  ) {
    console.log(
      `⚠ Regional skew detected: ${dominant[0]} accounts for ${((dominant[1].length / rows.length) * 100).toFixed(1)}% of the library (threshold ${REGIONAL_SHARE_THRESHOLD * 100}%).`,
    );
    console.log(
      "  The D-049 clarifier assumes the public library is global-by-curation.",
    );
    console.log(
      "  Action: add documents from under-represented regions, or rebalance by removing surplus.",
    );
    console.log("");
    console.log("  Docs in the dominant region (consider whether all are load-bearing):");
    for (const row of dominant[1].slice(0, 10)) {
      console.log(`    - ${row.title}`);
    }
    if (dominant[1].length > 10) {
      console.log(`    … and ${dominant[1].length - 10} more`);
    }
  } else {
    console.log(
      "✓ No single region exceeds the share threshold. Library is reasonably global.",
    );
  }

  // Curation-gap section.
  const missingGeography = byGeography.get("(no geography set)") ?? [];
  if (missingGeography.length > 0) {
    console.log("");
    console.log(
      `⚠ ${missingGeography.length} document(s) have NULL geography — curation gap:`,
    );
    for (const row of missingGeography.slice(0, 20)) {
      console.log(`    - ${row.title}`);
    }
    if (missingGeography.length > 20) {
      console.log(`    … and ${missingGeography.length - 20} more`);
    }
    console.log(
      "  Set geography via the manifest (scripts/public-library-manifest.ts) and re-run seed-public-corpus.",
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
