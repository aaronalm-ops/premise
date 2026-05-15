// Premise — Public-corpus commercial-safety audit (D-045).
//
// Usage: npm run audit-public-corpus
//
// Lists every document in the Premise Public Library project(s) partitioned
// by commercial safety:
//
//   ✓ SAFE      — licence permits commercial reuse (public-domain, OGL,
//                 CC-BY, CC-BY-SA, CC0, attribution-permitted)
//   ✗ BLOCKED   — DB will exclude these from retrieval when commercial
//                 mode is on (NC, unknown, null, permission-licensed)
//
// Run before any commercial pivot to see exactly what's about to be
// suppressed. The same flag drives the retrieval-time filter — what's
// shown as BLOCKED here is what disappears the moment PREMISE_COMMERCIAL_MODE
// flips to true.

import { getPublicLibraryIds } from "@/lib/db/projects";
import {
  isCommercialModeActive,
  partitionPublicLibraryBySafety,
} from "@/lib/db/commercial-safety";

async function main(): Promise<void> {
  console.log("Premise — public-corpus commercial-safety audit\n");

  const publicIds = await getPublicLibraryIds();
  if (publicIds.length === 0) {
    console.log("No public library projects found. Run `npm run seed-public-library` first.");
    return;
  }
  console.log(`Public library projects: ${publicIds.length}`);
  console.log(
    `Commercial mode (PREMISE_COMMERCIAL_MODE): ${isCommercialModeActive() ? "ON" : "OFF"}\n`,
  );

  const partition = await partitionPublicLibraryBySafety(publicIds);

  // BLOCKED first — these are the ones to act on.
  if (partition.blocked.length > 0) {
    console.log(
      `BLOCKED (${partition.blocked.length}) — excluded from retrieval when commercial mode is on:\n`,
    );
    // Group by reason so the audit reads as actionable categories.
    const byReason = new Map<string, typeof partition.blocked>();
    for (const row of partition.blocked) {
      const list = byReason.get(row.reason) ?? [];
      list.push(row);
      byReason.set(row.reason, list);
    }
    for (const [reason, rows] of byReason.entries()) {
      console.log(`  ${reason}  (${rows.length} document${rows.length === 1 ? "" : "s"})`);
      for (const r of rows) {
        const lic = r.licence ?? "(null)";
        console.log(`    [${lic}]  ${r.title}`);
      }
      console.log("");
    }
  } else {
    console.log("BLOCKED: none ✓\n");
  }

  // SAFE — full list, but compact (title + licence only).
  if (partition.safe.length > 0) {
    console.log(`SAFE (${partition.safe.length}) — commercially reusable:\n`);
    for (const r of partition.safe) {
      const lic = r.licence ?? "(null)";
      console.log(`  [${lic}]  ${r.title}`);
    }
    console.log("");
  } else {
    console.log("SAFE: none\n");
  }

  // Summary.
  console.log(`Summary:`);
  console.log(`  Total documents:   ${partition.totalCount}`);
  console.log(
    `  Safe for commercial: ${partition.safe.length} (${pct(partition.safe.length, partition.totalCount)})`,
  );
  console.log(
    `  Blocked for commercial: ${partition.blocked.length} (${pct(partition.blocked.length, partition.totalCount)})`,
  );

  if (partition.blocked.length > 0) {
    console.log("");
    console.log("Next steps to unblock specific documents:");
    console.log("  - For permission-licensed: email the publisher; on grant, update the");
    console.log("    manifest's `licence` to a specific value (e.g. attribution-permitted).");
    console.log("  - For unknown / null: open the PDF, find the licence footer or the");
    console.log("    publisher's terms-of-use page, update the manifest accordingly.");
    console.log("  - For CC-BY-NC* content: either remove from the manifest, or obtain a");
    console.log("    commercial licence from the publisher and update the licence value.");
    console.log("  - After any manifest edit, run `npm run seed-public-corpus` to refresh");
    console.log("    metadata (no re-embedding cost — content_hash skips the heavy work).");
  }
}

function pct(n: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((n / total) * 100)}%`;
}

main().catch((err) => {
  console.error("audit-public-corpus failed:", err);
  process.exit(1);
});
