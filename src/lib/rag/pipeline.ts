// The full strict-mode RAG pipeline:
//   1. retrieve  — top-12 chunks from pgvector by cosine similarity
//   2. rerank    — Haiku prunes to top-5 actually relevant
//   3. generate  — Sonnet drafts an answer, schema-forced citations
//   4. verify    — Haiku checks each claim is directly supported, drops failures
//
// Every Anthropic + Voyage call inside this pipeline records a row in
// api_calls (telemetry) tagged with the project_id.

import { retrieve } from "@/lib/rag/retrieval";
import { rerank } from "@/lib/rag/reranker";
import { generateAnswer } from "@/lib/rag/generation";
import { verifyAnswer } from "@/lib/rag/verification";
import type { AskResult } from "@/lib/rag/types";

export async function ask(
  question: string,
  projectId: string,
): Promise<AskResult> {
  const candidates = await retrieve(question, projectId, 12, {
    project_id: projectId,
    endpoint: "embed-query",
  });
  const top = await rerank(question, candidates, 5, {
    project_id: projectId,
    endpoint: "rerank",
  });
  const draft = await generateAnswer(question, top, {
    project_id: projectId,
    endpoint: "rag-draft",
  });
  const verified = await verifyAnswer(draft, top, {
    project_id: projectId,
    endpoint: "rag-verify",
  });

  const usedIds = new Set<string>();
  for (const c of verified.claims)
    for (const id of c.citation_ids) usedIds.add(id);

  return {
    question,
    answer: verified,
    retrieved_chunks: top,
    used_chunk_ids: Array.from(usedIds),
    cost_estimate_usd: 0,
  };
}
