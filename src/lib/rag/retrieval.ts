// Semantic retrieval over a project's chunks via Supabase pgvector.
//
// Confidentiality is enforced at the SQL boundary (D-016): match_chunks
// filters by an explicit array of project_ids. The user's own project_id is
// always passed; public-library project_ids are also passed (D-033) so the
// shared corpus is automatically searched alongside the user's private data.
// No cross-project leakage: only the project IDs we explicitly include can
// contribute chunks.

import { getSupabaseServer } from "@/lib/db/supabase";
import { getPublicLibraryIds } from "@/lib/db/projects";
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

  const publicIds = await getPublicLibraryIds();
  // Avoid duplicating the user's project_id if it happens to be public.
  const allProjectIds = [
    projectId,
    ...publicIds.filter((id) => id !== projectId),
  ];

  const supabase = getSupabaseServer();
  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: queryEmbedding,
    match_count: topK,
    p_project_ids: allProjectIds,
  });

  if (error) {
    throw new Error(`Retrieval failed: ${error.message}`);
  }

  return (data ?? []) as RetrievedChunk[];
}
