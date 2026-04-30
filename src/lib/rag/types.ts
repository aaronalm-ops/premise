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
