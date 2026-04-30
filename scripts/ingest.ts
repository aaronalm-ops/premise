// Premise — document ingestion CLI.
//
// Usage:
//   npm run ingest -- <projectId> <filePath> [title]
//
// Reads a .txt or .md file, chunks it, embeds each chunk via Voyage,
// and writes everything to Supabase. Idempotent on content_hash —
// re-ingesting the same file is a no-op.

import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { ingestDocument } from "@/lib/db/documents";
import { getProject } from "@/lib/db/projects";

async function main() {
  const [projectId, filePath, ...rest] = process.argv.slice(2);

  if (!projectId || !filePath) {
    console.error(
      "Usage: npm run ingest -- <projectId> <filePath> [title]\n",
    );
    process.exit(1);
  }

  const project = await getProject(projectId);
  if (!project) {
    console.error(`Project not found: ${projectId}`);
    process.exit(1);
  }

  const text = await readFile(filePath, "utf8");
  const title = rest.join(" ").trim() || basename(filePath);

  console.log(`Ingesting "${title}" into project "${project.name}"...`);
  console.log(`  source size: ${text.length.toLocaleString()} chars`);

  const result = await ingestDocument({
    projectId,
    title,
    text,
    sourcePath: filePath,
    mimeType: filePath.endsWith(".md") ? "text/markdown" : "text/plain",
  });

  if (result.skippedDuplicate) {
    console.log(
      `  Skipped — document with identical content already exists (id ${result.document.id}).`,
    );
    return;
  }

  console.log(`  Created document ${result.document.id}`);
  console.log(`  Chunks:    ${result.chunkCount}`);
  console.log(`  Embed tokens: ${result.embeddingTokens.toLocaleString()}`);
  console.log(
    `  Estimated cost: $${((result.embeddingTokens / 1_000_000) * 0.06).toFixed(4)}`,
  );
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
