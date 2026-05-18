// Hypothesis generation pipeline with prompt caching + telemetry.
// Reuses the strict-output chassis from D-010 / D-018:
// retrieve -> rerank -> Sonnet with forced tool_use -> citation discipline.
//
// D-049: now also carries the researcher's scope clarifications (Layer 1 of
// the brief-scope discipline) into the prompt, and forces a structural
// disclosure on each draft hypothesis about where its scope came from.

import { MODELS } from "@/lib/llm/anthropic";
import { tracedMessagesCreate } from "@/lib/telemetry/tracer";
import { HYPOTHESIS_SYSTEM } from "@/lib/prompts/hypothesis";
import { retrieve } from "@/lib/rag/retrieval";
import { rerank } from "@/lib/rag/reranker";
import { SCOPE_AXES, type HypothesisDraft, type RetrievedChunk, type ScopeClarifications, type ScopeDimensions, type ScopeInheritedFrom } from "@/lib/rag/types";

const SCOPE_INHERITED_VALUES: ScopeInheritedFrom[] = [
  "brief",
  "clarifier",
  "corpus",
  "model_default",
];

const HYPOTHESIS_TOOL = {
  name: "propose_hypotheses",
  description:
    "Returns 5-7 ranked, falsifiable hypotheses for the research brief, each grounded in cited chunks from the corpus.",
  input_schema: {
    type: "object" as const,
    properties: {
      hypotheses: {
        type: "array",
        minItems: 3,
        maxItems: 10,
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
            scope_inherited_from: {
              type: "string",
              enum: SCOPE_INHERITED_VALUES,
              description:
                "Where this hypothesis's scope came from. 'brief' if every scope axis in the statement traces to brief phrasing; 'clarifier' if any axis came from a researcher clarification; 'corpus' if you took scope from chunks without brief/clarifier support; 'model_default' if you generated scope from background knowledge. Mark honestly — the UI surfaces non-brief/clarifier values as a review prompt.",
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
            "scope_inherited_from",
          ],
        },
      },
    },
    required: ["hypotheses"],
  },
  cache_control: { type: "ephemeral" as const },
};

export type GenerateHypothesesInput = {
  briefContent: string;
  projectId: string;
  briefId?: string | null;
  count?: number; // 3-10, default 6
  // D-049: the researcher's resolutions on any scope axis the brief left
  // silent. When present, the generator is authorised to use these as scope
  // sources alongside the brief.
  scopeClarifications?: ScopeClarifications | null;
  // D-049: passed in for prompt context — what the brief itself specifies.
  // The generator uses this to decide which clarifier answers actually
  // matter (an axis the brief already specifies doesn't need re-stating).
  scopeDimensions?: ScopeDimensions | null;
};

export type GenerateHypothesesResult = {
  drafts: HypothesisDraft[];
  retrieved_chunks: RetrievedChunk[];
};

function formatScopeContext(
  dimensions: ScopeDimensions | null | undefined,
  clarifications: ScopeClarifications | null | undefined,
): string {
  const lines: string[] = [];
  for (const axis of SCOPE_AXES) {
    const dim = dimensions?.[axis];
    const clarification = clarifications?.[axis];

    if (dim?.specified) {
      lines.push(
        `- ${axis}: BRIEF SPECIFIES — "${dim.brief_mention ?? "(see brief)"}"`,
      );
    } else if (clarification && clarification !== "skipped") {
      lines.push(
        `- ${axis}: CLARIFIER AUTHORISED — "${clarification}"`,
      );
    } else if (clarification === "skipped") {
      lines.push(
        `- ${axis}: brief silent; researcher chose to skip → DO NOT add scope on this axis`,
      );
    } else {
      lines.push(
        `- ${axis}: brief silent; no clarification → DO NOT add scope on this axis`,
      );
    }
  }
  return lines.join("\n");
}

export async function generateHypotheses(
  input: GenerateHypothesesInput,
): Promise<GenerateHypothesesResult> {
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

  const scopeContext = formatScopeContext(
    input.scopeDimensions ?? null,
    input.scopeClarifications ?? null,
  );

  const count = Math.min(10, Math.max(3, input.count ?? 6));
  const userPrompt = `# Research brief\n${input.briefContent}\n\n# Scope authority for this brief (D-049)\n${scopeContext}\n\n# Retrieved chunks (your only source of grounding for CLAIMS — not for scope)\n${corpus}\n\nCall propose_hypotheses now with exactly ${count} hypotheses.`;

  const response = await tracedMessagesCreate(
    {
      model: MODELS.sonnet,
      max_tokens: 4096,
      system: [{ type: "text", text: HYPOTHESIS_SYSTEM }],
      tools: [HYPOTHESIS_TOOL],
      tool_choice: { type: "tool", name: HYPOTHESIS_TOOL.name },
      messages: [{ role: "user", content: userPrompt }],
    },
    { ...ctx, endpoint: "hypothesis-gen" },
  );

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
    .map((h) => {
      const scope: ScopeInheritedFrom = SCOPE_INHERITED_VALUES.includes(
        h.scope_inherited_from,
      )
        ? h.scope_inherited_from
        : "model_default";
      return {
        ...h,
        supporting_chunk_ids: (h.supporting_chunk_ids ?? []).filter((id) =>
          validIds.has(id),
        ),
        contradicting_chunk_ids: (h.contradicting_chunk_ids ?? []).filter(
          (id) => validIds.has(id),
        ),
        scope_inherited_from: scope,
      };
    })
    .filter(
      (h) =>
        h.supporting_chunk_ids.length > 0 ||
        h.contradicting_chunk_ids.length > 0,
    );

  return { drafts, retrieved_chunks: chunks };
}
