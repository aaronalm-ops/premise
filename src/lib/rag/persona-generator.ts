// Persona recommendation pipeline with prompt caching + telemetry.

import { MODELS } from "@/lib/llm/anthropic";
import { tracedMessagesCreate } from "@/lib/telemetry/tracer";
import { PERSONA_SYSTEM } from "@/lib/prompts/personas";
import { retrieve } from "@/lib/rag/retrieval";
import { rerank } from "@/lib/rag/reranker";
import type {
  Hypothesis,
  PersonaDraft,
  RetrievedChunk,
} from "@/lib/rag/types";

const PERSONA_TOOL = {
  name: "propose_personas",
  description:
    "Returns 3-5 ranked target audience personas for the research brief, each grounded in cited corpus chunks and naming what it under-represents.",
  input_schema: {
    type: "object" as const,
    properties: {
      personas: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "2-5 word descriptive handle.",
            },
            description: {
              type: "string",
              description:
                "2-3 sentences capturing who they are and why they matter for this brief.",
            },
            demographic_profile: {
              type: "string",
              description:
                "Short bullet phrases, semicolon-joined (Female; 28-44; Tier-1 metro; HHI > INR 12L).",
            },
            behavioural_profile: {
              type: "string",
              description:
                "Short bullet phrases on habits, channels, frictions.",
            },
            assumptions: {
              type: "array",
              items: { type: "string" },
              description: "Phrases the researcher should sanity-check.",
            },
            under_represents: {
              type: "string",
              description:
                "One specific sentence on what this persona does NOT capture. The single most important field.",
            },
            supporting_chunk_ids: {
              type: "array",
              items: { type: "string" },
              minItems: 1,
              description:
                "Retrieved chunk IDs that support the existence/relevance of this segment. Must be non-empty.",
            },
            priority: {
              type: "integer",
              minimum: 1,
              maximum: 5,
              description: "5 = most central to the brief.",
            },
          },
          required: [
            "name",
            "description",
            "demographic_profile",
            "behavioural_profile",
            "assumptions",
            "under_represents",
            "supporting_chunk_ids",
            "priority",
          ],
        },
      },
    },
    required: ["personas"],
  },
  cache_control: { type: "ephemeral" as const },
};

export type GeneratePersonasInput = {
  briefContent: string;
  projectId: string;
  acceptedHypotheses: Hypothesis[];
  briefId?: string | null;
};

export type GeneratePersonasResult = {
  drafts: PersonaDraft[];
  retrieved_chunks: RetrievedChunk[];
};

export async function generatePersonas(
  input: GeneratePersonasInput,
): Promise<GeneratePersonasResult> {
  const ctx = {
    project_id: input.projectId,
    brief_id: input.briefId ?? null,
  };

  const candidates = await retrieve(input.briefContent, input.projectId, 18, {
    ...ctx,
    endpoint: "embed-query",
  });
  const chunks = await rerank(input.briefContent, candidates, 8, {
    ...ctx,
    endpoint: "rerank",
  });

  if (chunks.length === 0) {
    return { drafts: [], retrieved_chunks: [] };
  }

  const corpus = chunks
    .map((c) => `<chunk id="${c.id}">\n${c.content}\n</chunk>`)
    .join("\n\n");

  const hypotheses =
    input.acceptedHypotheses.length > 0
      ? input.acceptedHypotheses
          .map((h, i) => `${i + 1}. ${h.statement}`)
          .join("\n")
      : "(none yet — propose personas based on the brief alone)";

  const userPrompt = `# Research brief\n${input.briefContent}\n\n# Accepted hypotheses\n${hypotheses}\n\n# Retrieved chunks (your source of grounding)\n${corpus}\n\nCall propose_personas now with 3-5 ranked personas.`;

  const response = await tracedMessagesCreate(
    {
      model: MODELS.sonnet,
      max_tokens: 3072,
      system: [{ type: "text", text: PERSONA_SYSTEM }],
      tools: [PERSONA_TOOL],
      tool_choice: { type: "tool", name: PERSONA_TOOL.name },
      messages: [{ role: "user", content: userPrompt }],
    },
    { ...ctx, endpoint: "persona-gen" },
  );

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("Persona generation did not produce a tool_use response");
  }

  const data = toolBlock.input as { personas: PersonaDraft[] };
  if (!Array.isArray(data.personas)) {
    throw new Error("Persona generation returned wrong shape");
  }

  const validIds = new Set(chunks.map((c) => c.id));
  const drafts = data.personas
    .map((p) => ({
      ...p,
      supporting_chunk_ids: (p.supporting_chunk_ids ?? []).filter((id) =>
        validIds.has(id),
      ),
    }))
    .filter((p) => p.supporting_chunk_ids.length > 0);

  return { drafts, retrieved_chunks: chunks };
}
