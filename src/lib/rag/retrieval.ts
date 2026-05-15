// Semantic retrieval over a project's chunks via Supabase pgvector.
//
// Confidentiality is enforced at the SQL boundary (D-016): match_chunks
// filters by an explicit array of project_ids. The user's own project_id is
// always passed; public-library project_ids are also passed (D-033) so the
// shared corpus is automatically searched alongside the user's private data.
// No cross-project leakage: only the project IDs we explicitly include can
// contribute chunks.
//
// Commercial-safety filter (D-045): when PREMISE_COMMERCIAL_MODE is on,
// retrieval drops chunks whose source document is `commercial_use_blocked`
// (NC content, unverified licence, permission-licensed-unverified). This is
// the gate that prevents the NC clauses on documents like the KPMG/Melbourne
// AI-trust report from leaking into commercial outputs.

import { getSupabaseServer } from "@/lib/db/supabase";
import { getPublicLibraryIds } from "@/lib/db/projects";
import { embed } from "@/lib/rag/voyage";
import {
  getCommerciallyBlockedDocumentIds,
  isCommercialModeActive,
} from "@/lib/db/commercial-safety";
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

  // When commercial mode is on we slightly over-fetch so the post-filter
  // doesn't leave us short on chunks. A 2x multiplier is enough in practice;
  // if the public library is mostly NC content this would need rethinking,
  // but the current corpus is ~75% safe so 2x covers the worst case.
  const commercialMode = isCommercialModeActive();
  const fetchCount = commercialMode ? topK * 2 : topK;

  const supabase = getSupabaseServer();
  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: queryEmbedding,
    match_count: fetchCount,
    p_project_ids: allProjectIds,
  });

  if (error) {
    throw new Error(`Retrieval failed: ${error.message}`);
  }

  const chunks = (data ?? []) as RetrievedChunk[];
  if (!commercialMode || chunks.length === 0) {
    return chunks.slice(0, topK);
  }

  // D-045: post-filter against the commercial-safety set. The blocked-IDs
  // query is a single SELECT id WHERE commercial_use_blocked = true — fast,
  // cached locally per-request. Any chunk whose document is blocked is
  // dropped before the retrieval result is returned upstream.
  const blockedDocIds = await getCommerciallyBlockedDocumentIds();
  const safeChunks = chunks.filter((c) => !blockedDocIds.has(c.document_id));
  return safeChunks.slice(0, topK);
}
