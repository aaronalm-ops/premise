// Reranker — second pass that prunes top-k retrieved chunks down to top-n
// truly relevant ones. Uses tool_use with a strict schema (L-4): the model
// MUST call `pick_relevant_chunks` with the indices it deems relevant. No more
// brittle free-text parsing.

import { MODELS } from "@/lib/llm/anthropic";
import { tracedMessagesCreate, type TraceContext } from "@/lib/telemetry/tracer";
import type { RetrievedChunk } from "@/lib/rag/types";

const RERANKER_SYSTEM = `You evaluate which retrieved text chunks are actually relevant to answering a researcher's question. Return only the chunks that contain information that DIRECTLY helps answer the question. Skip chunks that are merely on a similar topic.

Call pick_relevant_chunks with the chunk numbers (1-indexed) in order of relevance. Return an empty list if no chunks are relevant.`;

const RERANKER_TOOL = {
  name: "pick_relevant_chunks",
  description:
    "Returns the chunk numbers that directly help answer the question, in order of relevance.",
  input_schema: {
    type: "object" as const,
    properties: {
      relevant_chunk_numbers: {
        type: "array",
        description:
          "1-indexed chunk numbers, ordered by relevance (most relevant first). Empty if no chunks are relevant.",
        items: { type: "integer", minimum: 1 },
      },
    },
    required: ["relevant_chunk_numbers"],
  },
  cache_control: { type: "ephemeral" as const },
};

export async function rerank(
  question: string,
  chunks: RetrievedChunk[],
  keepTop: number = 5,
  context: TraceContext = { endpoint: "rerank" },
): Promise<RetrievedChunk[]> {
  if (chunks.length === 0) return [];
  if (chunks.length <= keepTop) return chunks;

  const numbered = chunks
    .map((c, i) => `[${i + 1}]\n${c.content}`)
    .join("\n\n---\n\n");

  const response = await tracedMessagesCreate(
    {
      model: MODELS.haiku,
      max_tokens: 200,
      system: [{ type: "text", text: RERANKER_SYSTEM }],
      tools: [RERANKER_TOOL],
      tool_choice: { type: "tool", name: RERANKER_TOOL.name },
      messages: [
        {
          role: "user",
          content: `Question: ${question}\n\nCandidate chunks:\n\n${numbered}`,
        },
      ],
    },
    context,
  );

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    return chunks.slice(0, keepTop);
  }

  const data = toolBlock.input as { relevant_chunk_numbers?: number[] };
  const indices = (data.relevant_chunk_numbers ?? [])
    .map((n) => n - 1)
    .filter((i) => Number.isInteger(i) && i >= 0 && i < chunks.length);

  const seen = new Set<number>();
  const ordered: RetrievedChunk[] = [];
  for (const i of indices) {
    if (!seen.has(i)) {
      seen.add(i);
      ordered.push(chunks[i]);
      if (ordered.length >= keepTop) break;
    }
  }

  return ordered;
}
