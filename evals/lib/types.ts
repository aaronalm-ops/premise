// Probe and result types for the eval harness.

export type ProbeType =
  | "golden-qa"
  | "abstention"
  | "hallucination"
  | "hypothesis-quality"
  | "persona-quality"
  | "confidentiality";

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

export type AnyProbe =
  | GoldenQaProbe
  | AbstentionProbe
  | HallucinationProbe
  | HypothesisQualityProbe
  | PersonaQualityProbe
  | ConfidentialityProbe;

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
};

export type EvalConfig = {
  project_a_id: string;
  project_b_id: string;
  fixtures_ingested: string[];
  created_at: string;
};
