// Hypothesis generation pipeline.
//
// Reuses the same primitives as the strict-mode RAG pipeline:
//   1. Retrieve top-k chunks relevant to the brief
//   2. Rerank to top-N actually relevant
//   3. Sonnet draft via forced tool_use schema
//
// The schema enforces citation discipline at the structural level (D-010, D-018):
// every hypothesis must cite supporting and/or contradicting chunks; pure
// speculation is rejected by the schema, not by the prompt.

import { getAnthropic, MODELS } from "@/lib/llm/anthropic";
import { HYPOTHESIS_SYSTEM } from "@/lib/prompts/hypothesis";
import { retrieve } from "@/lib/rag/retrieval";
import { rerank } from "@/lib/rag/reranker";
import type { HypothesisDraft, RetrievedChunk } from "@/lib/rag/types";

const HYPOTHESIS_TOOL = {
  name: "propose_hypotheses",
  description:
    "Returns 5-7 ranked, falsifiable hypotheses for the research brief, each grounded in cited chunks from the corpus.",
  input_schema: {
    type: "object" as const,
    properties: {
      hypotheses: {
        type: "array",
        minItems: 5,
        maxItems: 7,
        items: {
          type: "object",
          properties: {
            statement: {
              type: "string",
              description:
                "The hypothesis as a single declarative sentence. Specific to a segment / behaviour / measure. Not a question.",
            },
            assumptions: {
              type: "array",
              description:
                "Short bullet phrases naming the assumptions this hypothesis depends on.",
              items: { type: "string" },
            },
            expected_direction: {
              type: "string",
              description:
                "One short sentence describing what we'd observe in the data if this hypothesis were true.",
            },
            confirmation_criteria: {
              type: "string",
              description:
                "One short sentence describing the test or analysis that would confirm or refute the hypothesis.",
            },
            supporting_chunk_ids: {
              type: "array",
              description:
                "IDs of retrieved chunks that support this hypothesis. May be empty if contradicting_chunk_ids is non-empty.",
              items: { type: "string" },
            },
            contradicting_chunk_ids: {
              type: "array",
              description:
                "IDs of retrieved chunks that complicate or contradict this hypothesis. May be empty if supporting_chunk_ids is non-empty.",
              items: { type: "string" },
            },
            priority: {
              type: "integer",
              minimum: 1,
              maximum: 5,
              description:
                "Research value. 5 = novel + measurable + load-bearing for the brief. 1 = obvious / low-value.",
            },
          },
          required: [
            "statement",
            "assumptions",
            "expected_direction",
            "confirmation_criteria",
            "supporting_chunk_ids",
            "contradicting_chunk_ids",
            "priority",
          ],
        },
      },
    },
    required: ["hypotheses"],
  },
};

export type GenerateHypothesesInput = {
  briefContent: string;
  projectId: string;
};

export type GenerateHypothesesResult = {
  drafts: HypothesisDraft[];
  retrieved_chunks: RetrievedChunk[];
};

export async function generateHypotheses(
  input: GenerateHypothesesInput,
): Promise<GenerateHypothesesResult> {
  const candidates = await retrieve(input.briefContent, input.projectId, 18);
  const chunks = await rerank(input.briefContent, candidates, 8);

  if (chunks.length === 0) {
    return { drafts: [], retrieved_chunks: [] };
  }

  const corpus = chunks
    .map((c) => `<chunk id="${c.id}">\n${c.content}\n</chunk>`)
    .join("\n\n");

  const userPrompt = `# Research brief\n${input.briefContent}\n\n# Retrieved chunks (your only source of grounding)\n${corpus}\n\nCall propose_hypotheses now with 5-7 hypotheses.`;

  const anthropic = getAnthropic();
  const response = await anthropic.messages.create({
    model: MODELS.sonnet,
    max_tokens: 4096,
    system: HYPOTHESIS_SYSTEM,
    tools: [HYPOTHESIS_TOOL],
    tool_choice: { type: "tool", name: HYPOTHESIS_TOOL.name },
    messages: [{ role: "user", content: userPrompt }],
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("Hypothesis generation did not produce a tool_use response");
  }

  const input_data = toolBlock.input as { hypotheses: HypothesisDraft[] };
  if (!Array.isArray(input_data.hypotheses)) {
    throw new Error("Hypothesis generation returned wrong shape");
  }

  const validIds = new Set(chunks.map((c) => c.id));
  const drafts = input_data.hypotheses
    .map((h) => ({
      ...h,
      supporting_chunk_ids: (h.supporting_chunk_ids ?? []).filter((id) =>
        validIds.has(id),
      ),
      contradicting_chunk_ids: (h.contradicting_chunk_ids ?? []).filter((id) =>
        validIds.has(id),
      ),
    }))
    .filter(
      (h) =>
        h.supporting_chunk_ids.length > 0 ||
        h.contradicting_chunk_ids.length > 0,
    );

  return { drafts, retrieved_chunks: chunks };
}
