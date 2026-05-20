// D-050: Verdict-direction-check (analysis) + action/caveat consistency-check
// (recommendation).
//
// Both are independent verifier passes — they run AFTER the primary generator
// produces a draft and cross-check whether the artefact's parts agree with
// each other. Same chassis as D-042's citation-accuracy probe: an independent
// model (Sonnet here, since the call is per-verdict and the input is small)
// answers a narrow structured question via forced tool_use.
//
// Why this is needed even though both generators use forced tool_use already:
//   The schema enforces *that the fields exist*, not *that they agree*. The
//   ASEAN dogfood (2026-05-18) caught H10 carrying a `confirmed` label with
//   prose that said the opposite, and a merchant-payments recommendation
//   whose own caveats undermined its action. Schema-level enforcement can't
//   catch these — they're inter-field contradictions, not missing fields.
//
// On failure:
//   * Verdict direction mismatch → the verdict is rewritten to the
//     judge-recommended label (typically 'inconclusive'), and a caveat is
//     auto-appended explaining the rewrite. Surfaced on the analysis card so
//     the researcher can see the rewrite happened.
//   * Action undermined by caveats → confidence is downgraded one step
//     (high → medium → low → low) and a caveat is auto-appended. We don't
//     rewrite the action itself — that's a generator-level decision; we just
//     calibrate honestly.
//
// These edits are model-driven *and* visible. Same instinct as D-038 / D-041
// / D-049 — schema-enforced honesty over silent correction.

import { MODELS } from "@/lib/llm/anthropic";
import { tracedMessagesCreate } from "@/lib/telemetry/tracer";
import type {
  CorpusProvenance,
  HypothesisDraft,
  HypothesisVerdict,
  PersonaDraft,
  RecommendationConfidence,
  RecommendationDraft,
  RetrievedChunk,
} from "@/lib/rag/types";

// ============================================================================
// VERDICT-DIRECTION-CHECK
// ============================================================================

const VERDICT_DIRECTION_TOOL = {
  name: "check_verdict_direction",
  description:
    "Compares the hypothesis statement + expected direction against the verdict's prose direction and the verdict label. Reports whether they agree.",
  input_schema: {
    type: "object" as const,
    properties: {
      hypothesis_direction: {
        type: "string",
        description:
          "The direction the hypothesis predicts (e.g. 'Gen Z > Millennials on spend' or 'Tier-3 drivers prefer cash over wallet').",
      },
      evidence_direction: {
        type: "string",
        description:
          "The direction the supporting_evidence prose actually shows (e.g. 'Millennials > Gen Z on spend' if the prose says Millennials report higher spend).",
      },
      match: {
        type: "boolean",
        description:
          "True iff (hypothesis_direction matches evidence_direction AND verdict label is 'confirmed') OR (hypothesis_direction is opposite of evidence_direction AND verdict label is 'refuted') OR (evidence is genuinely mixed AND verdict label is 'inconclusive').",
      },
      recommended_verdict: {
        type: "string",
        enum: ["confirmed", "refuted", "inconclusive"],
        description:
          "What the verdict label should be given the prose direction. When match=true this equals the input verdict.",
      },
      explanation: {
        type: "string",
        description:
          "One short sentence explaining the comparison. If match=false, name the contradiction concretely (e.g. 'prose shows Millennials > Gen Z but verdict label says confirmed for a hypothesis claiming Gen Z > Millennials').",
      },
    },
    required: [
      "hypothesis_direction",
      "evidence_direction",
      "match",
      "recommended_verdict",
      "explanation",
    ],
  },
  cache_control: { type: "ephemeral" as const },
};

export type VerdictDirectionCheckResult = {
  match: boolean;
  recommended_verdict: "confirmed" | "refuted" | "inconclusive";
  explanation: string;
};

export async function checkVerdictDirection(input: {
  hypothesisStatement: string;
  hypothesisExpectedDirection: string | null;
  verdictLabel: "confirmed" | "refuted" | "inconclusive";
  supportingEvidence: string;
  projectId: string;
  briefId: string;
}): Promise<VerdictDirectionCheckResult> {
  const userPrompt = `# Hypothesis
${input.hypothesisStatement}

# Expected direction
${input.hypothesisExpectedDirection ?? "(not set)"}

# Verdict label
${input.verdictLabel}

# Supporting evidence (prose written by the analyser)
${input.supportingEvidence}

Call check_verdict_direction now. Be strict about directionality: if the prose names Group A as higher and the hypothesis predicts Group B as higher, that's a contradiction — even if the verdict label says "confirmed".`;

  const response = await tracedMessagesCreate(
    {
      model: MODELS.sonnet,
      max_tokens: 512,
      tools: [VERDICT_DIRECTION_TOOL],
      tool_choice: { type: "tool", name: VERDICT_DIRECTION_TOOL.name },
      messages: [{ role: "user", content: userPrompt }],
    },
    {
      project_id: input.projectId,
      brief_id: input.briefId,
      endpoint: "verdict-direction-check",
    },
  );

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    return {
      match: true,
      recommended_verdict: input.verdictLabel,
      explanation: "verdict-direction-check produced no tool_use; treated as match",
    };
  }
  const raw = toolBlock.input as {
    match?: unknown;
    recommended_verdict?: unknown;
    explanation?: unknown;
  };
  const match = Boolean(raw.match);
  const recommended_verdict =
    raw.recommended_verdict === "confirmed" ||
    raw.recommended_verdict === "refuted" ||
    raw.recommended_verdict === "inconclusive"
      ? raw.recommended_verdict
      : input.verdictLabel;
  const explanation =
    typeof raw.explanation === "string" ? raw.explanation : "(no explanation)";
  return { match, recommended_verdict, explanation };
}

// Applies the direction check across every verdict in a batch and rewrites
// mismatched verdicts to the judge-recommended label, auto-appending a
// caveat so the rewrite is visible on the artefact.
export async function rectifyVerdicts(input: {
  verdicts: HypothesisVerdict[];
  hypothesesById: Map<
    string,
    { statement: string; expected_direction: string | null }
  >;
  projectId: string;
  briefId: string;
}): Promise<HypothesisVerdict[]> {
  return Promise.all(
    input.verdicts.map(async (v) => {
      const h = input.hypothesesById.get(v.hypothesis_id);
      if (!h) return v;
      const result = await checkVerdictDirection({
        hypothesisStatement: h.statement,
        hypothesisExpectedDirection: h.expected_direction,
        verdictLabel: v.verdict,
        supportingEvidence: v.supporting_evidence,
        projectId: input.projectId,
        briefId: input.briefId,
      });
      if (result.match) return v;
      return {
        ...v,
        verdict: result.recommended_verdict,
        caveats: [
          ...v.caveats,
          `[Direction check] Verdict label adjusted from "${v.verdict}" to "${result.recommended_verdict}" — ${result.explanation}`,
        ],
      };
    }),
  );
}

// ============================================================================
// ACTION/CAVEAT CONSISTENCY-CHECK (recommendation)
// ============================================================================

const ACTION_CONSISTENCY_TOOL = {
  name: "check_action_consistency",
  description:
    "Reads a recommendation's action and its own caveats. Reports whether the caveats fundamentally undermine the action (i.e. acting on the recommendation while honouring the caveats would lead to the opposite outcome).",
  input_schema: {
    type: "object" as const,
    properties: {
      undermined: {
        type: "boolean",
        description:
          "True iff one or more caveats fundamentally undermine the action — meaning a reader following the caveats would NOT take the recommended action, or would do something nearly opposite.",
      },
      undermining_caveats: {
        type: "array",
        items: { type: "string" },
        description:
          "The specific caveat phrases that undermine the action. Empty when undermined=false.",
      },
      explanation: {
        type: "string",
        description:
          "One short sentence explaining the conflict (or 'no conflict' when undermined=false).",
      },
    },
    required: ["undermined", "undermining_caveats", "explanation"],
  },
  cache_control: { type: "ephemeral" as const },
};

export type ActionConsistencyResult = {
  undermined: boolean;
  undermining_caveats: string[];
  explanation: string;
};

const CONFIDENCE_DOWNGRADE: Record<RecommendationConfidence, RecommendationConfidence> = {
  high: "medium",
  medium: "low",
  low: "low",
};

export async function checkActionConsistency(input: {
  insight: string;
  recommendedAction: string;
  caveats: string[];
  projectId: string;
  briefId: string;
}): Promise<ActionConsistencyResult> {
  if (input.caveats.length === 0) {
    return {
      undermined: false,
      undermining_caveats: [],
      explanation: "no caveats to inspect",
    };
  }

  const caveatBlock = input.caveats
    .map((c, i) => `${i + 1}. ${c}`)
    .join("\n");

  const userPrompt = `# Insight
${input.insight}

# Recommended action
${input.recommendedAction}

# Caveats (the recommendation's own admissions)
${caveatBlock}

Call check_action_consistency now. Be strict: if a caveat says the underlying signal is unmeasured, or that the action's expected payoff is contradicted by another metric, mark the action as undermined.`;

  const response = await tracedMessagesCreate(
    {
      model: MODELS.sonnet,
      max_tokens: 512,
      tools: [ACTION_CONSISTENCY_TOOL],
      tool_choice: { type: "tool", name: ACTION_CONSISTENCY_TOOL.name },
      messages: [{ role: "user", content: userPrompt }],
    },
    {
      project_id: input.projectId,
      brief_id: input.briefId,
      endpoint: "action-consistency-check",
    },
  );

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    return {
      undermined: false,
      undermining_caveats: [],
      explanation: "action-consistency-check produced no tool_use",
    };
  }
  const raw = toolBlock.input as {
    undermined?: unknown;
    undermining_caveats?: unknown;
    explanation?: unknown;
  };
  return {
    undermined: Boolean(raw.undermined),
    undermining_caveats: Array.isArray(raw.undermining_caveats)
      ? (raw.undermining_caveats as unknown[]).filter(
          (c): c is string => typeof c === "string",
        )
      : [],
    explanation:
      typeof raw.explanation === "string" ? raw.explanation : "(no explanation)",
  };
}

export async function rectifyRecommendations(input: {
  drafts: RecommendationDraft[];
  projectId: string;
  briefId: string;
}): Promise<RecommendationDraft[]> {
  return Promise.all(
    input.drafts.map(async (r) => {
      const result = await checkActionConsistency({
        insight: r.insight,
        recommendedAction: r.recommended_action,
        caveats: r.caveats,
        projectId: input.projectId,
        briefId: input.briefId,
      });
      if (!result.undermined) return r;
      const newConfidence = CONFIDENCE_DOWNGRADE[r.confidence];
      return {
        ...r,
        confidence: newConfidence,
        caveats: [
          ...r.caveats,
          `[Consistency check] Confidence downgraded ${r.confidence} → ${newConfidence} — the recommendation's caveats undermine its action: ${result.explanation}`,
        ],
      };
    }),
  );
}

// ============================================================================
// PROVENANCE RECTIFIER (D-055 follow-up, 2026-05-19)
// ============================================================================
//
// The first probe run of D-055's provenance-honesty eval (2026-05-19) caught
// the model's most common failure mode: citing chunks that share a topic with
// the brief ("AI tooling") as if they supported the specific claim — when in
// fact the cited chunk only covers the study's sampling method or another
// tangential element. The runtime chassis already downgrades drafts with
// EMPTY citations; this rectifier handles drafts with PRESENT-BUT-IRRELEVANT
// citations.
//
// One batched Sonnet call per generation (not per draft) — same cost shape
// as D-035's batched verifier. Drafts flagged as topic-match-not-support get
// downgraded to 'general-knowledge' with citations stripped, so the card
// renders honestly.

const PROVENANCE_AUDIT_TOOL = {
  name: "audit_provenance_runtime",
  description:
    "For each draft, judge whether the cited chunks ACTUALLY SUPPORT the claim (not just share a topic with it). Returns one verdict per draft.",
  input_schema: {
    type: "object" as const,
    properties: {
      audits: {
        type: "array",
        items: {
          type: "object",
          properties: {
            index: {
              type: "integer",
              description: "1-indexed position in the input list.",
            },
            verdict: {
              type: "string",
              enum: ["supports", "topic-match-only", "no-citations"],
              description:
                "'supports' = cited chunks support the specific claim. 'topic-match-only' = chunks share a topic with the brief or the draft but DO NOT support this specific claim (most common failure: a method/sample chunk cited for a substantive findings claim). 'no-citations' = empty citation list.",
            },
            note: {
              type: "string",
              description:
                "One short sentence (≤25 words) when verdict ≠ supports.",
            },
          },
          required: ["index", "verdict", "note"],
        },
      },
    },
    required: ["audits"],
  },
  cache_control: { type: "ephemeral" as const },
};

type ProvenanceAuditVerdict =
  | "supports"
  | "topic-match-only"
  | "no-citations";

type ProvenanceAudit = {
  index: number;
  verdict: ProvenanceAuditVerdict;
  note: string;
};

const PROVENANCE_AUDIT_SYSTEM = `You are auditing whether cited chunks actually support a generated hypothesis or persona — or whether the citation is decorative (sharing a topic with the claim but not supporting it).

The most common failure to catch: the model cites a chunk that's from the same source as a relevant chunk, but the *specific* chunk it cited is about methodology, sample composition, or another tangential element — not about the substantive mechanism the draft claims.

Example of topic-match-only:
- Draft: "Researchers rank fabricated statistics as the most damaging AI failure mode."
- Cited chunk: "The study surveyed 142 senior insights professionals across India, the UK, and the US, using semi-structured interviews of 60-90 minutes."
- Verdict: topic-match-only. The chunk is from the right study but does not support the ranking claim.

Example of supports:
- Draft: "Researchers rank fabricated statistics as the most damaging AI failure mode."
- Cited chunk: "When ranked, fabricated statistics topped the list of damaging failures — 67% of respondents named it their top concern."
- Verdict: supports. The chunk directly supports the claim.

Be strict on topic-match-only. The cost of letting one through is a hypothesis label that lies about its grounding.`;

export async function auditProvenanceBatch(input: {
  items: Array<{
    statement: string;
    supportingChunkIds: string[];
    contradictingChunkIds: string[];
  }>;
  retrievedChunks: RetrievedChunk[];
  projectId: string;
  briefId: string | null;
}): Promise<ProvenanceAudit[]> {
  if (input.items.length === 0) return [];

  const chunkById = new Map(input.retrievedChunks.map((c) => [c.id, c]));

  const blocks = input.items.map((it, i) => {
    const cited = [
      ...it.supportingChunkIds.map((id) => ({
        kind: "supporting" as const,
        chunk: chunkById.get(id),
      })),
      ...it.contradictingChunkIds.map((id) => ({
        kind: "contradicting" as const,
        chunk: chunkById.get(id),
      })),
    ].filter((x) => x.chunk !== undefined);

    if (cited.length === 0) {
      return [
        `# Draft ${i + 1}`,
        `Statement: ${it.statement}`,
        `Cited chunks: (none — verdict should be 'no-citations')`,
      ].join("\n");
    }

    const citedBlock = cited
      .map(
        (c) =>
          `[${c.kind}, ${c.chunk!.id}] ${truncate(c.chunk!.content, 260)}`,
      )
      .join("\n");

    return [
      `# Draft ${i + 1}`,
      `Statement: ${it.statement}`,
      `Cited chunks:\n${citedBlock}`,
    ].join("\n");
  });

  const payload = `Audit each of the following ${input.items.length} drafts.\n\n${blocks.join("\n\n---\n\n")}\n\nCall audit_provenance_runtime now.`;

  const response = await tracedMessagesCreate(
    {
      model: MODELS.sonnet,
      max_tokens: 1024,
      system: [{ type: "text", text: PROVENANCE_AUDIT_SYSTEM }],
      tools: [PROVENANCE_AUDIT_TOOL],
      tool_choice: { type: "tool", name: PROVENANCE_AUDIT_TOOL.name },
      messages: [{ role: "user", content: payload }],
    },
    {
      project_id: input.projectId,
      brief_id: input.briefId,
      endpoint: "provenance-audit",
    },
  );

  const block = response.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") return [];
  const data = block.input as { audits?: ProvenanceAudit[] };
  return Array.isArray(data.audits) ? data.audits : [];
}

// Rectifier: takes hypothesis drafts post-generation. For each draft whose
// self-reported provenance is 'corpus-grounded' or 'corpus-inspired', runs
// the batched audit. Topic-match-only drafts get downgraded to
// 'general-knowledge' with citations stripped.
export async function rectifyHypothesisProvenance(input: {
  drafts: HypothesisDraft[];
  retrievedChunks: RetrievedChunk[];
  projectId: string;
  briefId: string | null;
}): Promise<HypothesisDraft[]> {
  // Only audit drafts that claim corpus support — general-knowledge drafts
  // don't need this check (they're already labelled honestly).
  const indicesToAudit: number[] = [];
  input.drafts.forEach((d, i) => {
    if (
      d.provenance === "corpus-grounded" ||
      d.provenance === "corpus-inspired"
    ) {
      indicesToAudit.push(i);
    }
  });
  if (indicesToAudit.length === 0) return input.drafts;

  const items = indicesToAudit.map((i) => ({
    statement: input.drafts[i].statement,
    supportingChunkIds: input.drafts[i].supporting_chunk_ids,
    contradictingChunkIds: input.drafts[i].contradicting_chunk_ids,
  }));

  const audits = await auditProvenanceBatch({
    items,
    retrievedChunks: input.retrievedChunks,
    projectId: input.projectId,
    briefId: input.briefId,
  });

  // Map audits back to the original draft indices.
  const auditByLocalIndex = new Map(audits.map((a) => [a.index - 1, a]));

  return input.drafts.map((d, originalIndex) => {
    const localIndex = indicesToAudit.indexOf(originalIndex);
    if (localIndex < 0) return d;
    const audit = auditByLocalIndex.get(localIndex);
    if (!audit || audit.verdict === "supports") return d;
    // 'topic-match-only' or 'no-citations' (which the generator should have
    // already downgraded, but defensively re-handle): strip citations and
    // mark general-knowledge.
    return {
      ...d,
      provenance: "general-knowledge" as CorpusProvenance,
      supporting_chunk_ids: [],
      contradicting_chunk_ids: [],
    };
  });
}

// Rectifier for personas — same pattern but persona drafts have only
// supporting_chunk_ids (no contradicting). Topic-match-only drafts get
// downgraded with citations stripped.
export async function rectifyPersonaProvenance(input: {
  drafts: PersonaDraft[];
  retrievedChunks: RetrievedChunk[];
  projectId: string;
  briefId: string | null;
}): Promise<PersonaDraft[]> {
  const indicesToAudit: number[] = [];
  input.drafts.forEach((d, i) => {
    if (
      d.provenance === "corpus-grounded" ||
      d.provenance === "corpus-inspired"
    ) {
      indicesToAudit.push(i);
    }
  });
  if (indicesToAudit.length === 0) return input.drafts;

  const items = indicesToAudit.map((i) => ({
    // Personas don't have a single 'statement' field; describe via name +
    // description so the auditor sees the substantive claim.
    statement: `${input.drafts[i].name} — ${input.drafts[i].description}`,
    supportingChunkIds: input.drafts[i].supporting_chunk_ids,
    contradictingChunkIds: [] as string[],
  }));

  const audits = await auditProvenanceBatch({
    items,
    retrievedChunks: input.retrievedChunks,
    projectId: input.projectId,
    briefId: input.briefId,
  });

  const auditByLocalIndex = new Map(audits.map((a) => [a.index - 1, a]));

  return input.drafts.map((d, originalIndex) => {
    const localIndex = indicesToAudit.indexOf(originalIndex);
    if (localIndex < 0) return d;
    const audit = auditByLocalIndex.get(localIndex);
    if (!audit || audit.verdict === "supports") return d;
    return {
      ...d,
      provenance: "general-knowledge" as CorpusProvenance,
      supporting_chunk_ids: [],
    };
  });
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
