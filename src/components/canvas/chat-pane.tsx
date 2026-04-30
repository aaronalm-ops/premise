"use client";

import { useState, type KeyboardEvent } from "react";
import type { AskResult, RetrievedChunk } from "@/lib/rag/types";

type Props = { projectId: string | null };

export function ChatPane({ projectId }: Props) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AskResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!projectId) {
      setError("Pick a project from the top right first.");
      return;
    }
    const trimmed = question.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, question: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Request failed (${res.status})`);
      } else {
        setResult(data as AskResult);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  };

  const canSubmit = !loading && !!projectId && question.trim().length > 0;

  return (
    <section className="flex h-full flex-col border-r border-[var(--color-border)]">
      <div className="border-b border-[var(--color-border)] px-6 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
          Conversation
        </h2>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-6">
        {!result && !loading && !error && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
            Ask any question. Premise will retrieve from your project&apos;s
            corpus and either answer with citations or honestly tell you
            what&apos;s missing.
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
            {error}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
            <span className="animate-pulse">Premise is thinking…</span>
            <p className="mt-1 text-xs opacity-70">
              Retrieving · reranking · drafting · verifying
            </p>
          </div>
        )}

        {result && <AnswerView result={result} />}
      </div>

      <div className="space-y-2 border-t border-[var(--color-border)] px-6 py-4">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            projectId
              ? "Ask something about the corpus…"
              : "Pick a project to start"
          }
          rows={3}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-foreground)]/10"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--color-muted-foreground)]">
            {projectId
              ? "Cmd / Ctrl + Enter to ask"
              : "No project selected"}
          </span>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="rounded-md bg-[var(--color-foreground)] px-4 py-1.5 text-xs font-medium text-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Asking…" : "Ask"}
          </button>
        </div>
      </div>
    </section>
  );
}

function AnswerView({ result }: { result: AskResult }) {
  const { answer, retrieved_chunks } = result;
  const chunkById = new Map(retrieved_chunks.map((c) => [c.id, c]));
  const noClaims = answer.claims.length === 0;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-3 text-sm">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
          Question
        </span>
        <p className="mt-1 text-[var(--color-foreground)]">{result.question}</p>
      </div>

      {noClaims && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
          <p className="text-[10px] font-semibold uppercase tracking-wider">
            Honest abstention
          </p>
          <p className="mt-1">
            The corpus does not support an answer to this question. Premise
            refuses to fabricate; the items below explain what&apos;s missing.
          </p>
        </div>
      )}

      {answer.claims.length > 0 && (
        <ul className="space-y-3">
          {answer.claims.map((claim, i) => (
            <li
              key={i}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm"
            >
              <ConfidenceBadge confidence={claim.confidence} />
              <p className="mt-1 leading-relaxed text-[var(--color-foreground)]">
                {claim.text}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1">
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  Cites:
                </span>
                {claim.citation_ids.map((id) => (
                  <CitationChip
                    key={id}
                    id={id}
                    chunk={chunkById.get(id)}
                  />
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      {answer.unanswered_aspects.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
          <p className="text-[10px] font-semibold uppercase tracking-wider">
            Not addressed by the corpus
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {answer.unanswered_aspects.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>
        </div>
      )}

      <details className="rounded-lg border border-[var(--color-border)] px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
        <summary className="cursor-pointer font-medium">
          Retrieved chunks ({retrieved_chunks.length})
        </summary>
        <ul className="mt-3 space-y-3">
          {retrieved_chunks.map((c) => (
            <li
              key={c.id}
              className="border-l-2 border-[var(--color-border)] pl-3"
            >
              <div className="font-mono text-[10px]">
                {c.id.slice(0, 8)} · similarity {c.similarity.toFixed(3)}
              </div>
              <p className="mt-1 leading-relaxed text-[var(--color-foreground)]">
                {c.content}
              </p>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function ConfidenceBadge({
  confidence,
}: {
  confidence: "high" | "medium" | "low";
}) {
  const colors = {
    high: "text-emerald-700 dark:text-emerald-300",
    medium: "text-amber-700 dark:text-amber-300",
    low: "text-zinc-500 dark:text-zinc-400",
  };
  return (
    <span
      className={`text-[10px] font-semibold uppercase tracking-wider ${colors[confidence]}`}
    >
      {confidence} confidence
    </span>
  );
}

function CitationChip({ id, chunk }: { id: string; chunk?: RetrievedChunk }) {
  return (
    <span
      className="rounded-full border border-[var(--color-border)] bg-[var(--color-muted)] px-2 py-0.5 font-mono text-[10px] text-[var(--color-muted-foreground)]"
      title={chunk?.content.slice(0, 200) ?? id}
    >
      {id.slice(0, 8)}
    </span>
  );
}
