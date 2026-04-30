// Strict-output answer generation with prompt caching.
// System prompt + tool definition are cached (90% input cost discount on cache hits).
// Anthropic tool_use forces every claim to have non-empty citation_ids.

import { MODELS } from "@/lib/llm/anthropic";
import { tracedMessagesCreate, type TraceContext } from "@/lib/telemetry/tracer";
import { STRICT_RAG_SYSTEM } from "@/lib/prompts/strict-rag";
import type { RetrievedChunk, StrictAnswer } from "@/lib/rag/types";

const ANSWER_TOOL = {
  name: "answer_with_citations",
  description:
    "Returns the answer to the researcher's question as a list of cited claims, plus any aspects of the question the corpus could not support.",
  input_schema: {
    type: "object" as const,
    properties: {
      claims: {
        type: "array",
        description:
          "List of factual claims that answer the question. Each claim must cite at least one retrieved chunk.",
        items: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description:
                "The claim, as a single self-contained statement. No hedging language inside the text.",
            },
            citation_ids: {
              type: "array",
              description:
                "IDs of the retrieved chunks that support this claim. Must be non-empty.",
              items: { type: "string" },
              minItems: 1,
            },
            confidence: {
              type: "string",
              enum: ["high", "medium", "low"],
              description:
                "high = chunks state it directly; medium = strongly implied; low = weakly supported.",
            },
          },
          required: ["text", "citation_ids", "confidence"],
        },
      },
      unanswered_aspects: {
        type: "array",
        description:
          "Parts of the question the corpus does not address. Use specific phrasing — 'Tier-3 cities are not represented' not 'some aspects unclear'.",
        items: { type: "string" },
      },
    },
    required: ["claims", "unanswered_aspects"],
  },
  cache_control: { type: "ephemeral" as const },
};

export async function generateAnswer(
  question: string,
  chunks: RetrievedChunk[],
  context: TraceContext = { endpoint: "rag-draft" },
): Promise<StrictAnswer> {
  if (chunks.length === 0) {
    return {
      claims: [],
      unanswered_aspects: [
        "The corpus contains no chunks relevant to this question.",
      ],
    };
  }

  const corpus = chunks
    .map((c) => `<chunk id="${c.id}">\n${c.content}\n</chunk>`)
    .join("\n\n");

  const userPrompt = `# Researcher's question\n${question}\n\n# Retrieved chunks (the only source you may use)\n${corpus}\n\nCall answer_with_citations now.`;

  const response = await tracedMessagesCreate(
    {
      model: MODELS.sonnet,
      max_tokens: 2048,
      system: [{ type: "text", text: STRICT_RAG_SYSTEM }],
      tools: [ANSWER_TOOL],
      tool_choice: { type: "tool", name: ANSWER_TOOL.name },
      messages: [{ role: "user", content: userPrompt }],
    },
    context,
  );

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("Generation did not produce a tool_use response");
  }

  const input = toolBlock.input as StrictAnswer;
  if (!Array.isArray(input.claims) || !Array.isArray(input.unanswered_aspects)) {
    throw new Error("Generation tool_use input has wrong shape");
  }

  const validChunkIds = new Set(chunks.map((c) => c.id));
  const filtered = input.claims.filter(
    (c) =>
      Array.isArray(c.citation_ids) &&
      c.citation_ids.length > 0 &&
      c.citation_ids.every((id) => validChunkIds.has(id)),
  );

  return {
    claims: filtered,
    unanswered_aspects: input.unanswered_aspects,
  };
}
