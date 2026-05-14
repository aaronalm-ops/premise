// Cost-at-scale projection helpers (D-043, taskforce critique 10d).
//
// The first question every commercial conversation asks: "how much per
// study?" Before this module, the answer was "I don't know — let me look it
// up." After: a calculator that turns observed averages from api_calls into
// a "per study" projection with explicit knobs the prospect can twiddle.
//
// All numbers are aggregated; no project content / no project-id leaves
// this layer. Safe to expose to a public page (D-030's private-share is
// preserved — we publish ANONYMISED averages, not individual call rows).

import { getSupabaseServer } from "@/lib/db/supabase";

// Endpoints we group cost by — should match the keys in prompt-versions.ts.
// "rag-*" rolls up to one cost-per-question bucket. Embeddings are tracked
// separately because they scale with corpus size, not with research stage.
export type CostBucket =
  | "ingestion"            // embed-doc + voyage indexing
  | "ask"                  // rag-draft + rag-verify + rerank + embed-query
  | "hypothesis-gen"
  | "persona-gen"
  | "question-gen"
  | "analysis-gen"
  | "recommendation-gen"
  | "story-gen"
  | "story-outline";

const ENDPOINT_TO_BUCKET: Record<string, CostBucket> = {
  "embed-doc": "ingestion",
  "embed-query": "ask",
  "rerank": "ask",
  "rag-draft": "ask",
  "rag-verify": "ask",
  "hypothesis-gen": "hypothesis-gen",
  "persona-gen": "persona-gen",
  "question-gen": "question-gen",
  "analysis-gen": "analysis-gen",
  "recommendation-gen": "recommendation-gen",
  "story-gen": "story-gen",
  "story-outline": "story-outline",
};

export type BucketAverage = {
  bucket: CostBucket;
  call_count: number;
  avg_cost_usd: number;
  total_cost_usd: number;
};

// Aggregates observed per-call cost from api_calls into per-bucket averages.
// "Per study" is then approximated by combining these averages with the user
// supplied volume (docs / questions / generations).
export async function observedBucketAverages(): Promise<BucketAverage[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("api_calls")
    .select("endpoint, cost_usd");

  if (error) throw new Error(`observedBucketAverages: ${error.message}`);

  type Row = { endpoint: string; cost_usd: number | string };
  const rows = (data ?? []) as Row[];

  const accum = new Map<CostBucket, { count: number; total: number }>();
  for (const row of rows) {
    const bucket = ENDPOINT_TO_BUCKET[row.endpoint];
    if (!bucket) continue;
    const existing = accum.get(bucket) ?? { count: 0, total: 0 };
    const cost =
      typeof row.cost_usd === "string"
        ? parseFloat(row.cost_usd)
        : row.cost_usd;
    accum.set(bucket, {
      count: existing.count + 1,
      total: existing.total + (Number.isFinite(cost) ? cost : 0),
    });
  }

  const out: BucketAverage[] = [];
  for (const [bucket, agg] of accum.entries()) {
    out.push({
      bucket,
      call_count: agg.count,
      avg_cost_usd: agg.count > 0 ? agg.total / agg.count : 0,
      total_cost_usd: agg.total,
    });
  }
  out.sort((a, b) => b.total_cost_usd - a.total_cost_usd);
  return out;
}

// Hardcoded fallback averages used when api_calls is empty (e.g. on a fresh
// deploy). These are conservative estimates from Premise's own dogfooding
// runs — published intentionally so the calculator works for prospects who
// don't have any usage on their account yet.
//
// Numbers derived from: Haiku 4.5 @ $0.80/MTok in, $4/MTok out; Sonnet 4.6
// @ $3/MTok in, $15/MTok out; voyage-3 @ $0.06/MTok. Each bucket assumes
// representative-call token counts with ~80% cache-hit rate on the system
// prompt blocks (D-021).
const FALLBACK_AVERAGES: Record<CostBucket, number> = {
  ingestion: 0.0008,            // per document, ~3000 tokens embedded
  ask: 0.012,                   // per question, retrieval + draft + verify
  "hypothesis-gen": 0.030,      // Sonnet synthesis, large prompt
  "persona-gen": 0.020,
  "question-gen": 0.040,        // 3 variants × ~5 questions = bulky output
  "analysis-gen": 0.060,        // largest single call
  "recommendation-gen": 0.020,
  "story-gen": 0.035,
  "story-outline": 0.025,       // per-angle outline draft
};

export type ProjectionInput = {
  docs: number;                 // documents ingested per study
  questions: number;            // questions asked of the corpus per study
  generations_per_stage: number; // typical 1; researchers regenerate when unsatisfied (~2)
  outlines: number;             // accepted angles drafted to outline per study
};

export type ProjectionOutput = {
  per_bucket: Array<{
    bucket: CostBucket;
    avg_cost_usd: number;
    multiplier: number;         // how many calls per study
    bucket_total_usd: number;
    source: "observed" | "fallback";
    observed_count?: number;
  }>;
  per_study_usd: number;
  monthly_usd_at_10_studies: number;
  per_study_breakdown_pct: Array<{ bucket: CostBucket; pct: number }>;
};

export function projectCostPerStudy(
  observed: BucketAverage[],
  input: ProjectionInput,
): ProjectionOutput {
  const observedMap = new Map(observed.map((o) => [o.bucket, o]));
  const buckets: CostBucket[] = [
    "ingestion",
    "ask",
    "hypothesis-gen",
    "persona-gen",
    "question-gen",
    "analysis-gen",
    "recommendation-gen",
    "story-gen",
    "story-outline",
  ];

  // Generations-per-stage scales the single-stage generators (hypothesis,
  // persona, question, analysis, recommendation, story). Ingestion scales
  // with docs; ask scales with questions; outline scales with outlines.
  const MULTIPLIER: Record<CostBucket, number> = {
    ingestion: input.docs,
    ask: input.questions,
    "hypothesis-gen": input.generations_per_stage,
    "persona-gen": input.generations_per_stage,
    "question-gen": input.generations_per_stage,
    "analysis-gen": input.generations_per_stage,
    "recommendation-gen": input.generations_per_stage,
    "story-gen": input.generations_per_stage,
    "story-outline": input.outlines,
  };

  const per_bucket: ProjectionOutput["per_bucket"] = [];
  for (const bucket of buckets) {
    const obs = observedMap.get(bucket);
    const useObserved = obs && obs.call_count >= 3; // need a few datapoints to trust
    const avg = useObserved ? obs!.avg_cost_usd : FALLBACK_AVERAGES[bucket];
    const multiplier = MULTIPLIER[bucket];
    per_bucket.push({
      bucket,
      avg_cost_usd: avg,
      multiplier,
      bucket_total_usd: avg * multiplier,
      source: useObserved ? "observed" : "fallback",
      observed_count: obs?.call_count,
    });
  }

  const per_study_usd = per_bucket.reduce(
    (acc, b) => acc + b.bucket_total_usd,
    0,
  );

  const per_study_breakdown_pct = per_bucket
    .map((b) => ({
      bucket: b.bucket,
      pct: per_study_usd > 0 ? (b.bucket_total_usd / per_study_usd) * 100 : 0,
    }))
    .sort((a, b) => b.pct - a.pct);

  return {
    per_bucket,
    per_study_usd,
    monthly_usd_at_10_studies: per_study_usd * 10,
    per_study_breakdown_pct,
  };
}

export const DEFAULT_PROJECTION_INPUT: ProjectionInput = {
  docs: 30,
  questions: 20,
  generations_per_stage: 2,
  outlines: 1,
};
