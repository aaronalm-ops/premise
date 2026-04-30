import { createHash } from "crypto";
import { getSupabaseServer } from "@/lib/db/supabase";
import { chunkText } from "@/lib/rag/chunking";
import { embed } from "@/lib/rag/voyage";
import type { Confidentiality, DocumentRecord } from "@/lib/rag/types";

export type IngestInput = {
  projectId: string;
  title: string;
  text: string;
  sourcePath?: string;
  mimeType?: string;
  confidentiality?: Confidentiality | null;
};

export type IngestResult = {
  document: DocumentRecord;
  chunkCount: number;
  embeddingTokens: number;
  skippedDuplicate: boolean;
};

const VOYAGE_BATCH = 64;

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export async function ingestDocument(input: IngestInput): Promise<IngestResult> {
  const supabase = getSupabaseServer();
  const hash = sha256(input.text);

  const { data: existing } = await supabase
    .from("documents")
    .select("*")
    .eq("project_id", input.projectId)
    .eq("content_hash", hash)
    .maybeSingle();

  if (existing) {
    return {
      document: existing as DocumentRecord,
      chunkCount: existing.chunk_count ?? 0,
      embeddingTokens: 0,
      skippedDuplicate: true,
    };
  }

  const chunks = chunkText(input.text);
  if (chunks.length === 0) {
    throw new Error(`Document "${input.title}" has no extractable content`);
  }

  let totalTokens = 0;
  const allEmbeddings: number[][] = [];
  for (let i = 0; i < chunks.length; i += VOYAGE_BATCH) {
    const batch = chunks.slice(i, i + VOYAGE_BATCH);
    const result = await embed(batch, "document", {
      project_id: input.projectId,
      endpoint: "embed-doc",
    });
    allEmbeddings.push(...result.embeddings);
    totalTokens += result.totalTokens;
  }

  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .insert({
      project_id: input.projectId,
      title: input.title,
      source_path: input.sourcePath ?? null,
      mime_type: input.mimeType ?? "text/plain",
      confidentiality: input.confidentiality ?? null,
      content_hash: hash,
      char_count: input.text.length,
      chunk_count: chunks.length,
    })
    .select("*")
    .single();

  if (docErr || !doc) {
    throw new Error(`Insert document failed: ${docErr?.message}`);
  }

  const rows = chunks.map((content, ordinal) => ({
    document_id: doc.id,
    project_id: input.projectId,
    content,
    ordinal,
    char_count: content.length,
    embedding: allEmbeddings[ordinal],
  }));

  const { error: chunksErr } = await supabase.from("chunks").insert(rows);
  if (chunksErr) {
    await supabase.from("documents").delete().eq("id", doc.id);
    throw new Error(`Insert chunks failed: ${chunksErr.message}`);
  }

  return {
    document: doc as DocumentRecord,
    chunkCount: chunks.length,
    embeddingTokens: totalTokens,
    skippedDuplicate: false,
  };
}
