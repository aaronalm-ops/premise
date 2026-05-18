// Prompt version registry (L-8).
// Bump the version of an entry when its system prompt or tool schema changes
// in a way that could affect output. The version is tagged on every recorded
// API call so we can diff behaviour across prompt revisions when investigating
// regressions or quality shifts.

export const PROMPT_VERSIONS = {
  "rag-draft": "v3-2026-05-01",          // STRICT_RAG_SYSTEM + ANSWER_TOOL
  "rag-verify": "v2-2026-05-01",         // batched verifier (D-035 / L-5)
  "rerank": "v2-2026-05-01",             // tool_use reranker (D-035 / L-4)
  "hypothesis-gen": "v3-2026-05-18",     // D-049: scope-from-brief discipline + scope_inherited_from field
  "persona-gen": "v3-2026-05-01",        // sample-size guidance (R-6)
  "question-gen": "v4-2026-05-14",       // D-040: one variant marked is_recommended per question (fatigue-default)
  "analysis-gen": "v2-2026-05-18",       // D-053: CSV-framing notice when source_type=csv in scope
  "recommendation-gen": "v2-2026-05-18", // D-051: action-class constraint + requires_behavioral_validation
  "story-gen": "v4-2026-05-18",          // D-052: For: single-buyer rule + lede-direction/audience-fit constraint
  "story-outline": "v1-2026-05-01",      // initial Phase 5 outline draft
  "scope-detect": "v1-2026-05-18",       // D-049: brief-scope detection (Haiku)
  "corpus-skew": "v1-2026-05-18",        // D-049: project-corpus skew detection (Haiku)
  "verdict-direction-check": "v1-2026-05-18", // D-050: analysis verdict-prose direction check
  "action-consistency-check": "v1-2026-05-18", // D-050: recommendation action/caveat consistency
  "embed-doc": "voyage-3",
  "embed-query": "voyage-3",
} as const;

export type PromptEndpoint = keyof typeof PROMPT_VERSIONS;

export function promptVersionFor(endpoint: string): string | null {
  return (PROMPT_VERSIONS as Record<string, string>)[endpoint] ?? null;
}
