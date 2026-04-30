// Semantic retrieval over a project's chunks via Supabase pgvector.
// Confidentiality is enforced at the SQL boundary — match_chunks filters by
// project_id, so chunks from other projects physically cannot surface here.

import { getSupabaseServer } from "@/lib/db/supabase";
import { embed } from "@/lib/rag/voyage";
import type { TraceContext } from "@/lib/telemetry/tracer";
import type { RetrievedChunk } from "@/lib/rag/types";

export async function retrieve(
  question: string,
  projectId: string,
  topK: number = 12,
  context: TraceContext = { endpoint: "embed-query" },
): Promise<RetrievedChunk[]> {
  const { embeddings } = await embed([question], "query", {
    ...context,
    project_id: context.project_id ?? projectId,
  });
  const queryEmbedding = embeddings[0];

  const supabase = getSupabaseServer();
  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: queryEmbedding,
    match_count: topK,
    p_project_id: projectId,
  });

  if (error) {
    throw new Error(`Retrieval failed: ${error.message}`);
  }

  return (data ?? []) as RetrievedChunk[];
}
