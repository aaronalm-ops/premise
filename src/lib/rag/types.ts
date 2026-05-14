export type Confidentiality = "public" | "client-confidential" | "nda-restricted";

export type Project = {
  id: string;
  name: string;
  description: string | null;
  confidentiality: Confidentiality;
  created_at: string;
};

export type DocumentRecord = {
  id: string;
  project_id: string;
  title: string;
  source_path: string | null;
  mime_type: string | null;
  confidentiality: Confidentiality | null;
  content_hash: string | null;
  char_count: number | null;
  chunk_count: number | null;
  created_at: string;
};

export type RetrievedChunk = {
  id: string;
  document_id: string;
  document_title: string | null;
  project_id: string;
  is_public_source: boolean;
  content: string;
  ordinal: number;
  similarity: number;
};

export type Claim = {
  text: string;
  citation_ids: string[];
  confidence: "high" | "medium" | "low";
};

export type StrictAnswer = {
  claims: Claim[];
  unanswered_aspects: string[];
};

export type AskResult = {
  question: string;
  answer: StrictAnswer;
  retrieved_chunks: RetrievedChunk[];
  used_chunk_ids: string[];
  cost_estimate_usd: number;
};

// ===== Phase 2: briefs + hypotheses =====

export type Brief = {
  id: string;
  project_id: string;
  title: string | null;
  content: string;
  created_at: string;
  updated_at: string;
};

export type HypothesisStatus = "proposed" | "accepted" | "rejected";

export type Hypothesis = {
  id: string;
  brief_id: string;
  project_id: string;
  ordinal: number;
  statement: string;
  assumptions: string[];
  expected_direction: string | null;
  confirmation_criteria: string | null;
  supporting_chunk_ids: string[];
  contradicting_chunk_ids: string[];
  priority: 1 | 2 | 3 | 4 | 5;
  status: HypothesisStatus;
  notes: string | null;
  // D-041 (taskforce 9a): if a hypothesis is revised AFTER an analysis has
  // run for its brief, the user is required to provide a rationale and
  // these two fields are populated. The story-angle generator reads this
  // to auto-append an integrity note to any angle whose evidence chain
  // touches the revised hypothesis.
  revised_after_analysis: boolean;
  revision_rationale: string | null;
  created_at: string;
  updated_at: string;
};

// Shape returned by the LLM tool_use call (before DB persistence)
export type HypothesisDraft = {
  statement: string;
  assumptions: string[];
  expected_direction: string;
  confirmation_criteria: string;
  supporting_chunk_ids: string[];
  contradicting_chunk_ids: string[];
  priority: 1 | 2 | 3 | 4 | 5;
};

export type HypothesisGenerationResult = {
  brief_id: string;
  hypotheses: Hypothesis[];
  retrieved_chunks: RetrievedChunk[];
};

// ===== Phase 3: personas + questions =====

export type Persona = {
  id: string;
  project_id: string;
  brief_id: string | null;
  ordinal: number;
  name: string;
  description: string;
  demographic_profile: string | null;
  behavioural_profile: string | null;
  assumptions: string[];
  under_represents: string | null;
  supporting_chunk_ids: string[];
  priority: 1 | 2 | 3 | 4 | 5;
  status: HypothesisStatus;
  created_at: string;
  updated_at: string;
};

export type PersonaDraft = {
  name: string;
  description: string;
  demographic_profile: string;
  behavioural_profile: string;
  assumptions: string[];
  under_represents: string;
  supporting_chunk_ids: string[];
  priority: 1 | 2 | 3 | 4 | 5;
};

export type VariantType =
  | "neutral_direct"
  | "leading"
  | "projective"
  | "behavioural"
  | "attitudinal"
  | "forced_choice"
  | "constant_sum"
  | "maxdiff";

export const VARIANT_TYPES: VariantType[] = [
  "neutral_direct",
  "leading",
  "projective",
  "behavioural",
  "attitudinal",
  "forced_choice",
  "constant_sum",
  "maxdiff",
];

// selection_mode is set server-side when the question's selected_variant_id
// is updated:
// - null   = this variant was not chosen (or no variant has been chosen yet)
// - default = chosen variant matched is_recommended (researcher accepted the
//   bot's pick — fatigue-default is a defensible default, D-040)
// - active = chosen variant did NOT match is_recommended (researcher
//   actively overrode the recommendation — an explicit choice)
export type VariantSelectionMode = "default" | "active" | null;

export type QuestionVariant = {
  id: string;
  question_id: string;
  ordinal: number;
  variant_type: VariantType;
  statement: string;
  response_format: string | null;
  response_options: string[];
  what_it_elicits: string | null;
  caveat: string | null;
  is_recommended: boolean;
  selection_mode: VariantSelectionMode;
  created_at: string;
};

export type QuestionVariantDraft = {
  variant_type: VariantType;
  statement: string;
  response_format: string;
  response_options: string[];
  what_it_elicits: string;
  caveat: string;
  is_recommended: boolean;
};

export type Question = {
  id: string;
  project_id: string;
  brief_id: string;
  hypothesis_id: string | null;
  ordinal: number;
  target_construct: string;
  rationale: string | null;
  selected_variant_id: string | null;
  status: HypothesisStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type QuestionWithVariants = Question & { variants: QuestionVariant[] };

export type QuestionDraft = {
  target_construct: string;
  rationale: string;
  hypothesis_id: string | null;
  variants: QuestionVariantDraft[];
};

// ===== Phase 4: analysis =====

export type AnalysisStatus = "idle" | "running" | "complete" | "failed";

export type AnalysisSourceType = "csv" | "transcript" | "paste" | "notes";

export type AnalysisData = {
  id: string;
  analysis_id: string;
  brief_id: string;
  project_id: string;
  source_type: AnalysisSourceType;
  title: string;
  content: string;
  char_count: number;
  created_at: string;
};

export type HypothesisVerdict = {
  hypothesis_id: string;
  verdict: "confirmed" | "refuted" | "inconclusive";
  confidence: "high" | "medium" | "low";
  summary: string;
  supporting_evidence: string;
  caveats: string[];
};

export type EmergentPattern = {
  pattern: string;
  description: string;
  evidence: string;
  why_interesting: string;
  priority: 1 | 2 | 3 | 4 | 5;
};

export type Analysis = {
  id: string;
  brief_id: string;
  project_id: string;
  status: AnalysisStatus;
  hypothesis_verdicts: HypothesisVerdict[];
  emergent_patterns: EmergentPattern[];
  caveats: string[];
  last_run_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type AnalysisWithData = Analysis & { data: AnalysisData[] };

export type AnalysisGenerationResult = {
  hypothesis_verdicts: HypothesisVerdict[];
  emergent_patterns: EmergentPattern[];
  caveats: string[];
};

// ===== Phase 5: story angles =====

export type StoryAngle = {
  id: string;
  brief_id: string;
  project_id: string;
  ordinal: number;
  title: string;
  target_audience: string;
  lede: string;
  beats: string[];
  supporting_hypothesis_ids: string[];
  supporting_emergent_patterns: string[];
  omits: string;
  priority: 1 | 2 | 3 | 4 | 5;
  status: HypothesisStatus;
  draft_outline: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type StoryAngleDraft = {
  title: string;
  target_audience: string;
  lede: string;
  beats: string[];
  supporting_hypothesis_ids: string[];
  supporting_emergent_patterns: string[];
  omits: string;
  priority: 1 | 2 | 3 | 4 | 5;
};

// ===== Recommendation artefact (D-039, taskforce critique 5a-5c) =====
//
// Sits between analysis and story angles. Single decision-shaped output
// for a C-suite reader: one causal insight, one specific action, one
// calibrated confidence, with explicit caveats.

export type RecommendationConfidence = "high" | "medium" | "low";

export type Recommendation = {
  id: string;
  brief_id: string;
  project_id: string;
  ordinal: number;
  insight: string;              // causal: "the change in X is driven by Y"
  recommended_action: string;   // specific: "do Z by Q"
  confidence: RecommendationConfidence;
  supporting_hypothesis_ids: string[];
  supporting_emergent_patterns: string[];
  caveats: string[];
  status: HypothesisStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type RecommendationDraft = {
  insight: string;
  recommended_action: string;
  confidence: RecommendationConfidence;
  supporting_hypothesis_ids: string[];
  supporting_emergent_patterns: string[];
  caveats: string[];
};
