// Recommendation generation pipeline (D-039, taskforce critique 5a-5c).
// Reuses the strict-output chassis from D-010 / D-018 / D-034 — Sonnet with
// forced tool_use. Operates on already-accepted hypotheses + verdicts +
// emergent patterns; doesn't do its own retrieval (the corpus has already
// been distilled into hypotheses, so no need to re-retrieve).
//
// Output discipline:
// - insight: causal, not descriptive.
// - recommended_action: specific, not generic.
// - confidence: calibrated against evidence-chain strength.
// - caveats: mandatory, specific.

import { MODELS } from "@/lib/llm/anthropic";
import { tracedMessagesCreate } from "@/lib/telemetry/tracer";
import { RECOMMENDATION_SYSTEM } from "@/lib/prompts/recommendation";
import type {
  Analysis,
  Hypothesis,
  Persona,
  RecommendationDraft,
} from "@/lib/rag/types";

const RECOMMENDATION_TOOL = {
  name: "propose_recommendations",
  description:
    "Returns 1-3 ranked, decision-shaped recommendations. Each carries a causal insight, a specific action, a calibrated confidence, an evidence chain, and explicit caveats.",
  input_schema: {
    type: "object" as const,
    properties: {
      recommendations: {
        type: "array",
        minItems: 0,
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            insight: {
              type: "string",
              description:
                "1-2 sentences. CAUSAL language ('is driven by', 'explains', 'leads to'). Not a summary.",
            },
            recommended_action: {
              type: "string",
              description:
                "1-2 sentences. SPECIFIC: name the action, the actor, broadly the timeframe.",
            },
            confidence: {
              type: "string",
              enum: ["high", "medium", "low"],
              description:
                "Calibrated against evidence-chain strength. high = mechanism supported by >=2 verdicts or >=1 verdict + >=1 pattern AND no contradicting caveats.",
            },
            supporting_hypothesis_ids: {
              type: "array",
              items: { type: "string" },
              description:
                "Hypothesis IDs this recommendation leans on. Must reference IDs from the prompt.",
            },
            supporting_emergent_patterns: {
              type: "array",
              items: { type: "string" },
              description:
                "Emergent-pattern names this recommendation leans on.",
            },
            caveats: {
              type: "array",
              minItems: 1,
              items: { type: "string" },
              description:
                "Specific caveats. Segments not represented, timeframe limits, methodological uncertainty.",
            },
          },
          required: [
            "insight",
            "recommended_action",
            "confidence",
            "supporting_hypothesis_ids",
            "supporting_emergent_patterns",
            "caveats",
          ],
        },
      },
    },
    required: ["recommendations"],
  },
  cache_control: { type: "ephemeral" as const },
};

export type GenerateRecommendationsInput = {
  briefContent: string;
  acceptedHypotheses: Hypothesis[];
  acceptedPersonas: Persona[];
  analysis: Analysis | null;
  projectId: string;
  briefId: string;
};

export type GenerateRecommendationsResult = {
  drafts: RecommendationDraft[];
};

export async function generateRecommendations(
  input: GenerateRecommendationsInput,
): Promise<GenerateRecommendationsResult> {
  if (input.acceptedHypotheses.length === 0) {
    throw new Error(
      "Accept at least one hypothesis before generating recommendations.",
    );
  }

  const ctx = {
    project_id: input.projectId,
    brief_id: input.briefId,
    endpoint: "recommendation-gen",
  };

  const hypothesesText = input.acceptedHypotheses
    .map((h) => {
      const verdict = input.analysis?.hypothesis_verdicts.find(
        (v) => v.hypothesis_id === h.id,
      );
      const verdictTag = verdict
        ? ` [verdict: ${verdict.verdict.toUpperCase()} (${verdict.confidence}) — ${verdict.summary}]`
        : " [no verdict — analysis hasn't run for this hypothesis]";
      return `- id="${h.id}" priority=${h.priority} :: ${h.statement}${verdictTag}`;
    })
    .join("\n");

  const patternsText = (input.analysis?.emergent_patterns ?? [])
    .sort((a, b) => b.priority - a.priority)
    .map(
      (p) =>
        `- "${p.pattern}" (priority ${p.priority}): ${p.description} — Why it matters: ${p.why_interesting}`,
    )
    .join("\n");

  const personasText =
    input.acceptedPersonas.length > 0
      ? input.acceptedPersonas
          .map(
            (p) =>
              `- ${p.name}: ${p.description} (under-represents: ${p.under_represents ?? "n/a"})`,
          )
          .join("\n")
      : "(none accepted)";

  const caveatsText = input.analysis?.caveats?.length
    ? input.analysis.caveats.map((c) => `- ${c}`).join("\n")
    : "(no analysis caveats — analysis hasn't run, or no study-wide issues flagged)";

  const userPrompt = `# Brief\n${input.briefContent}\n\n# Accepted hypotheses (with verdicts where available)\n${hypothesesText}\n\n# Emergent patterns from analysis\n${patternsText || "(none yet — analysis hasn't surfaced emergent patterns)"}\n\n# Recommended personas (for audience context)\n${personasText}\n\n# Study caveats\n${caveatsText}\n\nCall propose_recommendations now. Return 1-3 recommendations. If the evidence is too thin to ground a causal claim, return an empty array — do not fabricate.`;

  const response = await tracedMessagesCreate(
    {
      model: MODELS.sonnet,
      max_tokens: 2048,
      system: [{ type: "text", text: RECOMMENDATION_SYSTEM }],
      tools: [RECOMMENDATION_TOOL],
      tool_choice: { type: "tool", name: RECOMMENDATION_TOOL.name },
      messages: [{ role: "user", content: userPrompt }],
    },
    ctx,
  );

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error(
      "Recommendation generation did not produce a tool_use response",
    );
  }

  const data = toolBlock.input as { recommendations: RecommendationDraft[] };
  if (!Array.isArray(data.recommendations)) {
    throw new Error("Recommendation generation returned wrong shape");
  }

  const validHypothesisIds = new Set(input.acceptedHypotheses.map((h) => h.id));
  const drafts = data.recommendations
    .map((r) => ({
      ...r,
      supporting_hypothesis_ids: (r.supporting_hypothesis_ids ?? []).filter(
        (id) => validHypothesisIds.has(id),
      ),
      supporting_emergent_patterns: r.supporting_emergent_patterns ?? [],
      caveats: r.caveats ?? [],
    }))
    .filter(
      (r) =>
        (r.supporting_hypothesis_ids.length > 0 ||
          r.supporting_emergent_patterns.length > 0) &&
        r.caveats.length > 0,
    );

  return { drafts };
}
