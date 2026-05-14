// Probe and result types for the eval harness.

export type ProbeType =
  | "golden-qa"
  | "abstention"
  | "hallucination"
  | "hypothesis-quality"
  | "persona-quality"
  | "confidentiality"
  | "citation-accuracy";

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

export type AnyProbe =
  | GoldenQaProbe
  | AbstentionProbe
  | HallucinationProbe
  | HypothesisQualityProbe
  | PersonaQualityProbe
  | ConfidentialityProbe
  | CitationAccuracyProbe;

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
