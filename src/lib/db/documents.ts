import { createHash } from "crypto";
import { getSupabaseServer } from "@/lib/db/supabase";
import { chunkText } from "@/lib/rag/chunking";
import { embed } from "@/lib/rag/voyage";
import type {
  Confidentiality,
  DocumentRecord,
  Licence,
  SourceType,
} from "@/lib/rag/types";

// D-044: per-document provenance metadata used by the public-library
// bulk-ingestion path. The fields mirror the columns added in migration
// 0013 and are populated from scripts/public-library-manifest.ts entries.
export type DocumentMetadata = {
  licence?: Licence | null;
  licenceUrl?: string | null;
  sourceType?: SourceType | null;
  publicationYear?: number | null;
  geography?: string | null;
  topicTags?: string[];
  curatorsNote?: string | null;
};

export async function listDocuments(
  projectId: string,
): Promise<DocumentRecord[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listDocuments: ${error.message}`);
  return (data ?? []) as DocumentRecord[];
}

export type IngestInput = {
  projectId: string;
  title: string;
  text: string;
  sourcePath?: string;
  mimeType?: string;
  confidentiality?: Confidentiality | null;
  metadata?: DocumentMetadata;
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
    // D-044: even on a content-hash duplicate, refresh the provenance
    // metadata if the manifest has been edited. The text + embeddings are
    // unchanged; only the editorial layer flows through. This is what makes
    // the seed script safely re-runnable as the manifest evolves.
    let refreshed = existing as DocumentRecord;
    if (input.metadata && hasAnyMetadata(input.metadata)) {
      refreshed = await updateDocumentMetadata(existing.id, input.metadata);
    }
    return {
      document: refreshed,
      chunkCount: refreshed.chunk_count ?? 0,
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

  const meta = input.metadata ?? {};
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
      licence: meta.licence ?? null,
      licence_url: meta.licenceUrl ?? null,
      source_type: meta.sourceType ?? null,
      publication_year: meta.publicationYear ?? null,
      geography: meta.geography ?? null,
      topic_tags: meta.topicTags ?? [],
      curators_note: meta.curatorsNote ?? null,
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

// D-044: idempotent metadata refresh. The seed script calls this for
// content-hash duplicates so editing the manifest re-flows the editorial
// layer (licence, curator's note, tags) without re-embedding.
export async function updateDocumentMetadata(
  documentId: string,
  metadata: DocumentMetadata,
): Promise<DocumentRecord> {
  const supabase = getSupabaseServer();
  const patch: Record<string, unknown> = {};
  if (metadata.licence !== undefined) patch.licence = metadata.licence;
  if (metadata.licenceUrl !== undefined)
    patch.licence_url = metadata.licenceUrl;
  if (metadata.sourceType !== undefined)
    patch.source_type = metadata.sourceType;
  if (metadata.publicationYear !== undefined)
    patch.publication_year = metadata.publicationYear;
  if (metadata.geography !== undefined) patch.geography = metadata.geography;
  if (metadata.topicTags !== undefined) patch.topic_tags = metadata.topicTags;
  if (metadata.curatorsNote !== undefined)
    patch.curators_note = metadata.curatorsNote;

  const { data, error } = await supabase
    .from("documents")
    .update(patch)
    .eq("id", documentId)
    .select("*")
    .single();
  if (error) throw new Error(`updateDocumentMetadata: ${error.message}`);
  return data as DocumentRecord;
}

function hasAnyMetadata(m: DocumentMetadata): boolean {
  return (
    m.licence !== undefined ||
    m.licenceUrl !== undefined ||
    m.sourceType !== undefined ||
    m.publicationYear !== undefined ||
    m.geography !== undefined ||
    m.topicTags !== undefined ||
    m.curatorsNote !== undefined
  );
}
