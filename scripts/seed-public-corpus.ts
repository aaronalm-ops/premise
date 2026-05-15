// Premise — Bulk public-corpus ingester (D-044).
//
// Usage: npm run seed-public-corpus
//
// Reads scripts/public-library-manifest.ts, finds the Premise Public Library
// project (creating it if absent — same logic as seed-public-library.ts),
// and ingests every manifest entry whose local file is present.
//
// Idempotent on three layers:
//   1. The library project is found-or-created (D-033).
//   2. Document content_hash skips re-embedding for already-ingested files.
//   3. Metadata refreshes on every run, so editing the manifest re-flows
//      the editorial layer without re-embedding.

import { readFile, stat } from "node:fs/promises";
import { resolve, basename } from "node:path";
import { getSupabaseServer } from "@/lib/db/supabase";
import { ingestDocument } from "@/lib/db/documents";
import { extractFromFile } from "@/lib/ingest/extractors";
import {
  PUBLIC_LIBRARY_MANIFEST,
  type ManifestEntry,
} from "./public-library-manifest";

const LIBRARY_NAME = "Premise Public Library";

async function findOrCreateLibrary(): Promise<string> {
  const supabase = getSupabaseServer();

  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .eq("name", LIBRARY_NAME)
    .eq("is_public", true)
    .maybeSingle();

  if (existing) return existing.id as string;

  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: LIBRARY_NAME,
      description:
        "Default public corpus shared across all users. Curated open-licence sources across government, academic, trade body, agency, analyst, and methodology buckets. See docs/PUBLIC_CORPUS_TASKFORCE.md.",
      confidentiality: "public",
      is_public: true,
      owner_id: null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to create public library project: ${error?.message}`,
    );
  }
  return data.id as string;
}

function mimeTypeFor(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx") || lower.endsWith(".doc"))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".md") || lower.endsWith(".markdown"))
    return "text/markdown";
  return "text/plain";
}

type IngestionTally = {
  ingested: number;
  refreshed: number;
  missing: number;
  failed: number;
  totalEmbeddingTokens: number;
};

async function ingestEntry(
  entry: ManifestEntry,
  libraryId: string,
  tally: IngestionTally,
): Promise<void> {
  const absPath = resolve(process.cwd(), entry.file);

  try {
    await stat(absPath);
  } catch {
    console.log(`  ⊘ Missing on disk: ${entry.file} — skipping ("${entry.title}")`);
    tally.missing += 1;
    return;
  }

  try {
    const bytes = await readFile(absPath);
    const extracted = await extractFromFile({
      filename: basename(absPath),
      mimeType: mimeTypeFor(absPath),
      bytes: bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ),
    });

    if (extracted.text.trim().length === 0) {
      console.log(`  ✗ Empty extraction: ${entry.file} — skipping`);
      tally.failed += 1;
      return;
    }

    const result = await ingestDocument({
      projectId: libraryId,
      title: entry.title,
      text: extracted.text,
      sourcePath: entry.file,
      mimeType: extracted.mimeType,
      confidentiality: "public",
      metadata: {
        licence: entry.licence,
        licenceUrl: entry.licenceUrl,
        sourceType: entry.sourceType,
        publicationYear: entry.publicationYear,
        geography: entry.geography,
        topicTags: entry.topicTags,
        curatorsNote: entry.curatorsNote,
      },
    });

    if (result.skippedDuplicate) {
      console.log(
        `  ↻ Metadata refreshed: "${entry.title}" (${result.document.id.slice(0, 8)})`,
      );
      tally.refreshed += 1;
    } else {
      console.log(
        `  ✓ Ingested: "${entry.title}" — ${result.chunkCount} chunks, ${result.embeddingTokens.toLocaleString()} embed tokens`,
      );
      tally.ingested += 1;
      tally.totalEmbeddingTokens += result.embeddingTokens;
    }
  } catch (err) {
    console.log(`  ✗ Failed: ${entry.file} — ${(err as Error).message}`);
    tally.failed += 1;
  }
}

async function main(): Promise<void> {
  console.log("Premise — public corpus seeder\n");

  if (PUBLIC_LIBRARY_MANIFEST.length === 0) {
    console.log(
      "Manifest is empty. Add entries to scripts/public-library-manifest.ts and re-run.",
    );
    console.log(
      "See docs/PUBLIC_CORPUS_SHOPPING_LIST.md for the Perplexity prompts that populate it.",
    );
    return;
  }

  const libraryId = await findOrCreateLibrary();
  console.log(`Library project: ${libraryId}\n`);
  console.log(`Manifest entries: ${PUBLIC_LIBRARY_MANIFEST.length}\n`);

  const tally: IngestionTally = {
    ingested: 0,
    refreshed: 0,
    missing: 0,
    failed: 0,
    totalEmbeddingTokens: 0,
  };

  for (const entry of PUBLIC_LIBRARY_MANIFEST) {
    await ingestEntry(entry, libraryId, tally);
  }

  console.log("");
  console.log("Summary:");
  console.log(`  Newly ingested:        ${tally.ingested}`);
  console.log(`  Metadata refreshed:    ${tally.refreshed}`);
  console.log(`  Missing on disk:       ${tally.missing}`);
  console.log(`  Failed:                ${tally.failed}`);
  console.log(
    `  Total embed tokens:    ${tally.totalEmbeddingTokens.toLocaleString()}`,
  );
  console.log(
    `  Estimated cost:        $${((tally.totalEmbeddingTokens / 1_000_000) * 0.06).toFixed(4)}`,
  );

  if (tally.missing > 0) {
    console.log(
      `\nTip: ${tally.missing} manifest entries point to files that don't exist locally yet. Download the PDFs (via Perplexity-discovered URLs) into corpus/public-library/ and re-run.`,
    );
  }
}

main().catch((err) => {
  console.error("seed-public-corpus failed:", err);
  process.exit(1);
});
