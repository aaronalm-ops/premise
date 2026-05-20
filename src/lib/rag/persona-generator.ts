// Persona recommendation pipeline with prompt caching + telemetry.
//
// D-055: corpus is inspiration, not a fence. Personas declare provenance.
// Strict-citation filter removed; honest labelling replaces it.

import { MODELS } from "@/lib/llm/anthropic";
import { tracedMessagesCreate } from "@/lib/telemetry/tracer";
import { PERSONA_SYSTEM } from "@/lib/prompts/personas";
import { retrieve } from "@/lib/rag/retrieval";
import { rerank } from "@/lib/rag/reranker";
import { rectifyPersonaProvenance } from "@/lib/rag/consistency-checks";
import type {
  CorpusProvenance,
  Hypothesis,
  PersonaDraft,
  RetrievedChunk,
} from "@/lib/rag/types";

const PROVENANCE_VALUES: CorpusProvenance[] = [
  "corpus-grounded",
  "corpus-inspired",
  "general-knowledge",
];

const PERSONA_TOOL = {
  name: "propose_personas",
  description:
    "Returns 3-5 ranked target audience personas for the research brief. Each declares its provenance tier (corpus-grounded / corpus-inspired / general-knowledge) and names what it under-represents.",
  input_schema: {
    type: "object" as const,
    properties: {
      personas: {
        type: "array",
        minItems: 2,
        maxItems: 7,
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
              description:
                "Retrieved chunk IDs that support this persona. Required (non-empty) when provenance is 'corpus-grounded' or 'corpus-inspired'; may be empty when provenance is 'general-knowledge'.",
            },
            priority: {
              type: "integer",
              minimum: 1,
              maximum: 5,
              description: "5 = most central to the brief.",
            },
            provenance: {
              type: "string",
              enum: PROVENANCE_VALUES,
              description:
                "D-055: where this persona's archetype came from. 'corpus-grounded' = corpus directly describes this segment; 'corpus-inspired' = corpus describes a behavioural pattern, extended to a brief-relevant target; 'general-knowledge' = standard segmentation from background knowledge, no chunk support. Honest labelling — the UI tags each card with its provenance.",
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
            "provenance",
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
  count?: number; // 2-7, default 4
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
  const chunks =
    candidates.length === 0
      ? []
      : await rerank(input.briefContent, candidates, 8, {
          ...ctx,
          endpoint: "rerank",
        });

  const corpus =
    chunks.length > 0
      ? chunks
          .map((c) => `<chunk id="${c.id}">\n${c.content}\n</chunk>`)
          .join("\n\n")
      : "(no retrieved chunks — generate personas with provenance='general-knowledge' from background knowledge. Do not refuse.)";

  const hypotheses =
    input.acceptedHypotheses.length > 0
      ? input.acceptedHypotheses
          .map((h, i) => `${i + 1}. ${h.statement}`)
          .join("\n")
      : "(none yet — propose personas based on the brief alone)";

  const count = Math.min(7, Math.max(2, input.count ?? 4));
  const userPrompt = `# Research brief\n${input.briefContent}\n\n# Accepted hypotheses\n${hypotheses}\n\n# Retrieved chunks (inspiration; cite when grounding, otherwise mark provenance='general-knowledge')\n${corpus}\n\nCall propose_personas now with exactly ${count} ranked personas.`;

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
  const preRectifyDrafts = data.personas.map((p) => {
    const provenance: CorpusProvenance = PROVENANCE_VALUES.includes(
      p.provenance,
    )
      ? p.provenance
      : "general-knowledge";
    const supporting = (p.supporting_chunk_ids ?? []).filter((id) =>
      validIds.has(id),
    );
    // Same integrity rule as hypotheses: a 'corpus-grounded' / 'corpus-inspired'
    // self-report with no valid citations gets downgraded to 'general-knowledge'.
    const corrected: CorpusProvenance =
      (provenance === "corpus-grounded" || provenance === "corpus-inspired") &&
      supporting.length === 0
        ? "general-knowledge"
        : provenance;
    return {
      ...p,
      supporting_chunk_ids: supporting,
      provenance: corrected,
    };
  });

  // D-055 footnote (2026-05-19): runtime rectifier catches the present-but-
  // irrelevant citation case the empty-citation downgrade can't see.
  const drafts =
    chunks.length > 0
      ? await rectifyPersonaProvenance({
          drafts: preRectifyDrafts,
          retrievedChunks: chunks,
          projectId: input.projectId,
          briefId: input.briefId ?? null,
        })
      : preRectifyDrafts;

  return { drafts, retrieved_chunks: chunks };
}
