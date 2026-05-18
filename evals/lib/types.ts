// Probe and result types for the eval harness.

export type ProbeType =
  | "golden-qa"
  | "abstention"
  | "hallucination"
  | "hypothesis-quality"
  | "persona-quality"
  | "confidentiality"
  | "citation-accuracy"
  | "hypothesis-judge"
  | "persona-judge"
  | "recommendation-judge"
  | "story-angle-judge"
  | "variant-judge"
  | "prompt-injection"
  | "scope-discipline";

export type GoldenQaProbe = {
  id: string;
  type: "golden-qa";
  description: string;
  question: string;
  expects: {
    min_claims: number;
    any_claim_contains_substring?: string[];
    must_have_citations: boolean;
    should_not_abstain: boolean;
  };
};

export type AbstentionProbe = {
  id: string;
  type: "abstention";
  description: string;
  question: string;
  expects: {
    claims_count: number;
    unanswered_aspects_min: number;
  };
};

export type HallucinationProbe = {
  id: string;
  type: "hallucination";
  description: string;
  question: string;
  expects: {
    abstain_or_cite: boolean;
    forbidden_substring_in_claims?: string[];
  };
};

export type HypothesisQualityProbe = {
  id: string;
  type: "hypothesis-quality";
  description: string;
  brief_title: string;
  brief_content: string;
  expects: {
    min_hypotheses: number;
    all_grounded: boolean;
    all_have_expected_direction: boolean;
    all_have_confirmation_criteria: boolean;
    statements_distinct: boolean;
    min_average_statement_length: number;
  };
};

export type PersonaQualityProbe = {
  id: string;
  type: "persona-quality";
  description: string;
  brief_title: string;
  brief_content: string;
  expects: {
    min_personas: number;
    all_grounded: boolean;
    all_have_under_represents: boolean;
    min_under_represents_length: number;
    names_distinct: boolean;
  };
};

export type ConfidentialityProbe = {
  id: string;
  type: "confidentiality";
  description: string;
  query_against: "A" | "B" | "nonexistent";
  question: string;
  expects: {
    no_chunks_from_other_project: boolean;
    forbidden_substring_in_any_chunk?: string[];
  };
};

// D-042 (taskforce 8a): asks a question, then for every claim returned by
// the pipeline, uses an INDEPENDENT Sonnet judge (separate from the Haiku
// verifier that runs during generation) to check whether the cited chunks
// actually support the claim. Detects verifier drift and false-positives
// in the existing chassis.
export type CitationAccuracyProbe = {
  id: string;
  type: "citation-accuracy";
  description: string;
  question: string;
  expects: {
    min_claims: number;             // skip judging if generation produced fewer
    min_support_rate: number;       // fraction (0.0–1.0) of claims that must be Sonnet-supported
  };
};

// ============================================================================
// D-046 (closing deferred audit items R-1 / R-2 / E-1 / E-2 / E-3 / E-4).
//
// Judge-based probes: a Sonnet-as-judge layer on top of the structural quality
// probes. Existing hypothesis-quality / persona-quality probes assert that
// fields exist and statements are non-duplicate (the FLOOR). The judge probes
// score qualitative properties — specificity, falsifiability, distinctness,
// calibration honesty — against a rubric returned via forced tool_use (the
// CEILING, in D-038's vocabulary).
//
// Each judge probe asks Sonnet to score 1-5 on multiple dimensions and pass/
// fail against per-probe thresholds. Same pattern as D-042 citation-accuracy:
// independent model, stricter prompt, runs in eval rather than in the
// user-facing flow.
// ============================================================================

export type JudgeScoreThresholds = {
  min_score: number;          // each dimension must score >=
  min_average_score?: number; // across all dimensions
};

export type HypothesisJudgeProbe = {
  id: string;
  type: "hypothesis-judge";
  description: string;
  brief_title: string;
  brief_content: string;
  // Scores: specificity, falsifiability, evidence_tightness, novelty,
  // distinctness_across_set. Each 1-5.
  expects: JudgeScoreThresholds & {
    min_hypotheses: number;
  };
};

export type PersonaJudgeProbe = {
  id: string;
  type: "persona-judge";
  description: string;
  brief_title: string;
  brief_content: string;
  // Scores: behavioural_specificity, distinctness_across_set,
  // under_represents_quality, grounded_to_corpus. Each 1-5.
  expects: JudgeScoreThresholds & {
    min_personas: number;
  };
};

export type RecommendationJudgeProbe = {
  id: string;
  type: "recommendation-judge";
  description: string;
  brief_title: string;
  brief_content: string;
  // Scores: causal_insight_clarity, action_specificity,
  // calibration_honesty, caveat_completeness. Each 1-5.
  expects: JudgeScoreThresholds & {
    min_recommendations: number;
  };
};

export type StoryAngleJudgeProbe = {
  id: string;
  type: "story-angle-judge";
  description: string;
  brief_title: string;
  brief_content: string;
  // Scores: audience_distinctness_across_set, lede_sharpness,
  // evidence_chain_coherence, omits_honesty. Each 1-5.
  expects: JudgeScoreThresholds & {
    min_angles: number;
  };
};

// D-040 / E-3: for each question, asks Sonnet "which of these 3 variants
// would you recommend as the fatigue-default?" and compares to the
// is_recommended flag set by the generator. Measures the agreement rate.
export type VariantJudgeProbe = {
  id: string;
  type: "variant-judge";
  description: string;
  brief_title: string;
  brief_content: string;
  expects: {
    min_questions: number;
    min_agreement_rate: number; // fraction of questions where judge agrees with is_recommended
  };
};

// E-4: adversarial probes. Inputs that try to make the pipeline fabricate,
// leak system prompt, ignore abstention, or cite non-existent chunks.
export type PromptInjectionProbe = {
  id: string;
  type: "prompt-injection";
  description: string;
  question: string;
  expects: {
    // Either abstain (no claims OR explicit unanswered_aspects)
    // or refuse to comply (no leaked system prompt content, no
    // fabricated citations).
    must_abstain_or_refuse: boolean;
    forbidden_substring_in_claims?: string[];
  };
};

// D-049: scope-discipline probes verify that hypotheses inherit scope from
// the brief, not from corpus skew. A region-neutral brief should NOT produce
// region-locked hypothesis statements, regardless of how regional the
// retrieved chunks are. Each probe declares forbidden substrings (the
// regional / temporal / segment / channel words that must NOT appear in a
// statement) and the audit-trail expectations on scope_inherited_from.
export type ScopeDisciplineProbe = {
  id: string;
  type: "scope-discipline";
  description: string;
  brief_title: string;
  brief_content: string;
  expects: {
    min_hypotheses: number;
    // Words that must NOT appear in any hypothesis statement.
    forbidden_substrings_in_statement: string[];
    // Each draft must self-report a non-leak source: 'brief' or 'clarifier'.
    // Any 'corpus' or 'model_default' marker is a fail.
    all_scope_from_brief_or_clarifier: boolean;
  };
};

export type AnyProbe =
  | GoldenQaProbe
  | AbstentionProbe
  | HallucinationProbe
  | HypothesisQualityProbe
  | PersonaQualityProbe
  | ConfidentialityProbe
  | CitationAccuracyProbe
  | HypothesisJudgeProbe
  | PersonaJudgeProbe
  | RecommendationJudgeProbe
  | StoryAngleJudgeProbe
  | VariantJudgeProbe
  | PromptInjectionProbe
  | ScopeDisciplineProbe;

export type ProbeResult = {
  probe_id: string;
  probe_type: ProbeType;
  description: string;
  passed: boolean;
  reasons: string[];
  duration_ms: number;
};

export type EvalRunSummary = {
  started_at: string;
  finished_at: string;
  duration_ms: number;
  total: number;
  passed: number;
  failed: number;
  by_type: Record<ProbeType, { total: number; passed: number; failed: number }>;
  results: ProbeResult[];
  cost?: {
    total_usd: number;
    call_count: number;
    cache_hit_rate: number;
  };
};

export type EvalConfig = {
  project_a_id: string;
  project_b_id: string;
  fixtures_ingested: string[];
  created_at: string;
};
