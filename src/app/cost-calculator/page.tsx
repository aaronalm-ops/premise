"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

// D-043 / taskforce 10d. Standalone, linkable, no-auth-required.
// Answers the question every commercial conversation opens with: "how much
// per study?" Uses observed averages from this Premise deployment's
// api_calls table where possible, and conservative fallbacks where not.

type Bucket =
  | "ingestion"
  | "ask"
  | "hypothesis-gen"
  | "persona-gen"
  | "question-gen"
  | "analysis-gen"
  | "recommendation-gen"
  | "story-gen"
  | "story-outline";

const BUCKET_LABELS: Record<Bucket, string> = {
  ingestion: "Document ingestion (embeddings)",
  ask: "Ask the corpus (RAG: retrieve + draft + verify)",
  "hypothesis-gen": "Hypothesis generation",
  "persona-gen": "Persona recommendation",
  "question-gen": "Questionnaire (with variants)",
  "analysis-gen": "Analysis (verdicts + emergent patterns)",
  "recommendation-gen": "Recommendation",
  "story-gen": "Story angles",
  "story-outline": "Outline drafting",
};

const BUCKET_HINTS: Record<Bucket, string> = {
  ingestion: "Scales with the number of documents in the corpus.",
  ask: "Scales with the number of questions asked. Pipeline = embed → retrieve → rerank → draft → verify.",
  "hypothesis-gen":
    "Sonnet synthesis. Cost grows with how many times you regenerate to explore alternatives.",
  "persona-gen": "Sonnet synthesis. Same regenerate dynamics as hypothesis-gen.",
  "question-gen":
    "Sonnet. Largest by default — 3 variants per question, every variant carries the methodological caveat.",
  "analysis-gen": "Sonnet. Single largest call (verdicts × hypotheses + emergent patterns).",
  "recommendation-gen": "Sonnet. Causal-claim distillation; capped at 3 recommendations.",
  "story-gen": "Sonnet. 3-4 angles, each with an evidence chain.",
  "story-outline": "Sonnet. Per accepted angle, one structured markdown outline.",
};

type Projection = {
  input: {
    docs: number;
    questions: number;
    generations_per_stage: number;
    outlines: number;
  };
  observed_total_calls: number;
  projection: {
    per_bucket: Array<{
      bucket: Bucket;
      avg_cost_usd: number;
      multiplier: number;
      bucket_total_usd: number;
      source: "observed" | "fallback";
      observed_count?: number;
    }>;
    per_study_usd: number;
    monthly_usd_at_10_studies: number;
    per_study_breakdown_pct: Array<{ bucket: Bucket; pct: number }>;
  };
};

export default function CostCalculatorPage() {
  const [docs, setDocs] = useState(30);
  const [questions, setQuestions] = useState(20);
  const [generations, setGenerations] = useState(2);
  const [outlines, setOutlines] = useState(1);
  const [data, setData] = useState<Projection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjection = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        docs: String(docs),
        questions: String(questions),
        generations_per_stage: String(generations),
        outlines: String(outlines),
      });
      const r = await fetch(`/api/cost-projection?${params.toString()}`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? `Failed (${r.status})`);
      setData(json as Projection);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [docs, questions, generations, outlines]);

  useEffect(() => {
    fetchProjection();
  }, [fetchProjection]);

  const observedFraction = useMemo(() => {
    if (!data) return 0;
    const observed = data.projection.per_bucket.filter(
      (b) => b.source === "observed",
    ).length;
    return observed / data.projection.per_bucket.length;
  }, [data]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
          Premise · cost-at-scale calculator
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--color-foreground)]">
          How much does one research study cost on Premise?
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
          The first question every commercial conversation opens with. The
          answer below is built from this deployment&apos;s actual API-call
          history where available, and conservative fallbacks where not.
          Adjust the knobs to match your study shape.
        </p>
        <p className="mt-2 text-xs italic leading-relaxed text-[var(--color-muted-foreground)]">
          Numbers reflect API spend only (Anthropic + Voyage). Hosting,
          storage, and operational time are not included. Calibrated against
          observed cache-hit rates (D-021); your mileage will vary with
          prompt-cache warm-up and model routing.
        </p>
      </header>

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Slider
          label="Documents in the corpus"
          hint="Decks, transcripts, reports, URLs — anything you ingest for this study."
          value={docs}
          min={0}
          max={500}
          step={10}
          onChange={setDocs}
        />
        <Slider
          label="Ad-hoc questions asked"
          hint="NotebookLM-style queries during the study."
          value={questions}
          min={0}
          max={500}
          step={5}
          onChange={setQuestions}
        />
        <Slider
          label="Regenerations per stage"
          hint="How many times you re-run each generator while exploring (typically 1-3)."
          value={generations}
          min={1}
          max={10}
          step={1}
          onChange={setGenerations}
        />
        <Slider
          label="Angles drafted to outline"
          hint="Accepted story angles you fully draft (typically 1-2)."
          value={outlines}
          min={0}
          max={10}
          step={1}
          onChange={setOutlines}
        />
      </section>

      {error && (
        <p className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      )}

      {data && (
        <>
          <section className="mb-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-5 py-4">
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  Projected per study
                </p>
                <p className="mt-0.5 text-3xl font-semibold text-[var(--color-foreground)]">
                  ${data.projection.per_study_usd.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  At 10 studies / month
                </p>
                <p className="mt-0.5 text-lg font-medium text-[var(--color-foreground)]">
                  ${data.projection.monthly_usd_at_10_studies.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  Built from
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                  {data.observed_total_calls.toLocaleString()} observed API
                  calls · {Math.round(observedFraction * 100)}% of buckets
                  use observed averages
                </p>
              </div>
            </div>
            {loading && (
              <p className="mt-3 text-xs italic text-[var(--color-muted-foreground)]">
                Recomputing…
              </p>
            )}
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Per-stage breakdown
            </h2>
            <div className="space-y-2">
              {data.projection.per_bucket.map((b) => (
                <div
                  key={b.bucket}
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-medium text-[var(--color-foreground)]">
                      {BUCKET_LABELS[b.bucket]}
                    </p>
                    <p className="font-mono text-xs">
                      ${b.bucket_total_usd.toFixed(3)}
                    </p>
                  </div>
                  <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">
                    {b.multiplier}× ${b.avg_cost_usd.toFixed(4)} per call ·{" "}
                    <span
                      className={
                        b.source === "observed"
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-amber-700 dark:text-amber-300"
                      }
                    >
                      {b.source === "observed"
                        ? `observed (${b.observed_count} calls)`
                        : "fallback estimate (no observations yet)"}
                    </span>
                  </p>
                  <p className="mt-1 text-[11px] italic text-[var(--color-muted-foreground)]">
                    {BUCKET_HINTS[b.bucket]}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-8 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-3">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
              How costs scale
            </h2>
            <ul className="mt-2 space-y-1 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
              {data.projection.per_study_breakdown_pct
                .filter((p) => p.pct > 0)
                .slice(0, 4)
                .map((p) => (
                  <li key={p.bucket}>
                    <span className="font-mono">{p.pct.toFixed(1)}%</span>{" "}
                    of study cost is {BUCKET_LABELS[p.bucket].toLowerCase()}.
                  </li>
                ))}
            </ul>
          </section>
        </>
      )}

      <footer className="mt-12 border-t border-[var(--color-border)] pt-6 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
        <p>
          Calculator uses anonymised aggregate averages from this
          deployment&apos;s <code>api_calls</code> table. No project
          identifiers, no project content, no per-call rows are exposed by
          this page or the underlying{" "}
          <code className="font-mono">/api/cost-projection</code> endpoint.
        </p>
        <p className="mt-2">
          Why a fixed deployment&apos;s averages? Because the same study
          shape costs roughly the same regardless of corpus content — prompt
          tokens dominate output tokens once prompt caching is in (D-021),
          and the calculator&apos;s job is to set a credible upper-bound on{" "}
          <em>"how much is this going to cost me?"</em>, not to compete with
          a real-time billing meter.
        </p>
      </footer>
    </main>
  );
}

function Slider({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-[var(--color-foreground)]">
          {label}
        </span>
        <span className="font-mono text-sm text-[var(--color-foreground)]">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      <p className="text-[10px] italic text-[var(--color-muted-foreground)]">
        {hint}
      </p>
    </label>
  );
}
