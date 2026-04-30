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
  created_at: string;
};

export type QuestionVariantDraft = {
  variant_type: VariantType;
  statement: string;
  response_format: string;
  response_options: string[];
  what_it_elicits: string;
  caveat: string;
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
