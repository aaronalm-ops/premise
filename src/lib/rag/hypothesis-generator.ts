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
import { rectifyHypothesisProvenance } from "@/lib/rag/consistency-checks";
import {
  SCOPE_AXES,
  type CorpusProvenance,
  type HypothesisDraft,
  type RetrievedChunk,
  type ScopeClarifications,
  type ScopeDimensions,
  type ScopeInheritedFrom,
} from "@/lib/rag/types";

const SCOPE_INHERITED_VALUES: ScopeInheritedFrom[] = [
  "brief",
  "clarifier",
  "corpus",
  "model_default",
];

const PROVENANCE_VALUES: CorpusProvenance[] = [
  "corpus-grounded",
  "corpus-inspired",
  "general-knowledge",
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
            provenance: {
              type: "string",
              enum: PROVENANCE_VALUES,
              description:
                "D-055: where the hypothesis's content (not scope — that's scope_inherited_from) came from. 'corpus-grounded' = mechanism directly supported by a retrieved chunk (supporting/contradicting chunk_ids non-empty); 'corpus-inspired' = mechanism observed in a chunk, extended to a context the chunk doesn't cover (still cite the chunk); 'general-knowledge' = from background knowledge of consumer behaviour, no chunk support (citations may be empty). Generate a mix when the corpus partially covers the brief; use 'general-knowledge' freely when the corpus doesn't cover the topic. The UI labels each card with its provenance so the researcher always knows the source.",
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
            "provenance",
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

  // D-055: even when retrieval is empty (corpus doesn't cover the brief),
  // generate hypotheses from general knowledge. The model labels each one
  // honestly via the `provenance` field. The old short-circuit refused to
  // help; that's been removed.
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
      : "(no retrieved chunks — the corpus does not cover this brief's topic. Generate hypotheses with provenance='general-knowledge', citing nothing. Do not refuse.)";

  const scopeContext = formatScopeContext(
    input.scopeDimensions ?? null,
    input.scopeClarifications ?? null,
  );

  const count = Math.min(10, Math.max(3, input.count ?? 6));
  const userPrompt = `# Research brief\n${input.briefContent}\n\n# Scope authority for this brief (D-049)\n${scopeContext}\n\n# Retrieved chunks (use as INSPIRATION; cite them when supporting a claim, but you may also produce 'general-knowledge' hypotheses that go beyond the corpus)\n${corpus}\n\nCall propose_hypotheses now with exactly ${count} hypotheses. A mix of provenance tiers is healthy when the corpus partially covers the brief; use 'general-knowledge' freely when the corpus is silent on the topic.`;

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
  const preRectifyDrafts = input_data.hypotheses
    .map((h) => {
      const scope: ScopeInheritedFrom = SCOPE_INHERITED_VALUES.includes(
        h.scope_inherited_from,
      )
        ? h.scope_inherited_from
        : "model_default";
      const provenance: CorpusProvenance = PROVENANCE_VALUES.includes(
        h.provenance,
      )
        ? h.provenance
        : "general-knowledge";
      const supporting = (h.supporting_chunk_ids ?? []).filter((id) =>
        validIds.has(id),
      );
      const contradicting = (h.contradicting_chunk_ids ?? []).filter((id) =>
        validIds.has(id),
      );
      // D-055: provenance integrity. If a draft self-reported as
      // 'corpus-grounded' or 'corpus-inspired' but has no valid chunk
      // citations (because the model hallucinated chunk IDs the retrieval
      // never returned), downgrade to 'general-knowledge' rather than
      // pretending the corpus supports it. Honest labelling > false
      // grounding.
      const correctedProvenance: CorpusProvenance =
        (provenance === "corpus-grounded" ||
          provenance === "corpus-inspired") &&
        supporting.length === 0 &&
        contradicting.length === 0
          ? "general-knowledge"
          : provenance;
      return {
        ...h,
        supporting_chunk_ids: supporting,
        contradicting_chunk_ids: contradicting,
        scope_inherited_from: scope,
        provenance: correctedProvenance,
      };
    });

  // D-055: no more strict-citation filter. General-knowledge hypotheses are
  // allowed and useful — they're how the tool helps the researcher when the
  // corpus doesn't cover the brief. Each card carries its provenance tag so
  // the researcher always knows the source.

  // D-055 footnote (2026-05-19): the first probe run caught the model
  // routinely citing topic-matching chunks (the methodology paragraph from
  // a study) as if they grounded substantive claims. The runtime chassis
  // already strips empty citations + downgrades; this rectifier handles
  // the present-but-irrelevant case. One batched Sonnet call per generation.
  const drafts =
    chunks.length > 0
      ? await rectifyHypothesisProvenance({
          drafts: preRectifyDrafts,
          retrievedChunks: chunks,
          projectId: input.projectId,
          briefId: input.briefId ?? null,
        })
      : preRectifyDrafts;

  return { drafts, retrieved_chunks: chunks };
}
