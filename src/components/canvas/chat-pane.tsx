"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import type { AskResult, RetrievedChunk } from "@/lib/rag/types";

type Props = { projectId: string | null };

type HistoryEntry = AskResult & { id: string };

export function ChatPane({ projectId }: Props) {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Load chat history on project change (U-1: chat persistence).
  useEffect(() => {
    if (!projectId) {
      setHistory([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/projects/${projectId}/ask-log`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const entries = (data.entries ?? []) as Array<{
          id: string;
          question: string;
          answer: AskResult["answer"];
          retrieved_chunks: AskResult["retrieved_chunks"];
          used_chunk_ids: string[];
          cost_estimate_usd: number;
        }>;
        setHistory(
          entries.map((e) => ({
            id: e.id,
            question: e.question,
            answer: e.answer,
            retrieved_chunks: e.retrieved_chunks,
            used_chunk_ids: e.used_chunk_ids,
            cost_estimate_usd: e.cost_estimate_usd,
          })),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const submit = async () => {
    if (!projectId) {
      setError("Pick a project from the top right first.");
      return;
    }
    const trimmed = question.trim();
    if (!trimmed) return;

    setLoading(true);
    setLoadingStage("Retrieving from corpus…");
    setError(null);

    // U-5: pipeline-stage hints. We don't have streaming, so we cycle through
    // the stages on a timer to communicate that work is happening.
    const stages = [
      "Retrieving from corpus…",
      "Reranking chunks…",
      "Drafting answer with citations…",
      "Verifying each claim…",
    ];
    let stageIdx = 0;
    const timer = setInterval(() => {
      stageIdx = Math.min(stageIdx + 1, stages.length - 1);
      setLoadingStage(stages[stageIdx]);
    }, 2200);

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
        // Append to history so the user sees a scrollable thread.
        const entry: HistoryEntry = { ...(data as AskResult), id: crypto.randomUUID() };
        setHistory((h) => [...h, entry]);
        setQuestion("");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      clearInterval(timer);
      setLoading(false);
      setLoadingStage("");
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

      <div className="premise-scroll min-h-0 flex-1 space-y-4 overflow-y-scroll px-6 py-6">
        {history.length === 0 && !loading && !error && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
            Ask any question. Premise will retrieve from your project&apos;s
            corpus and either answer with citations or honestly tell you
            what&apos;s missing. {projectId && "Conversation history is saved per-project."}
          </div>
        )}

        {history.map((entry) => (
          <AnswerView key={entry.id} result={entry} />
        ))}

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
            {error}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
            <span className="animate-pulse">{loadingStage || "Premise is thinking…"}</span>
            <p className="mt-1 text-[10px] opacity-70">
              Retrieve → rerank → draft → verify
            </p>
          </div>
        )}
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
  const isPublic = chunk?.is_public_source ?? false;
  const label = chunk?.document_title?.trim() || id.slice(0, 8);
  const truncated = label.length > 32 ? `${label.slice(0, 32)}…` : label;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${
        isPublic
          ? "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-100"
          : "border-[var(--color-border)] bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
      }`}
      title={chunk?.content.slice(0, 200) ?? id}
    >
      {isPublic && (
        <span className="font-semibold uppercase tracking-wider opacity-80">
          Public
        </span>
      )}
      <span className="font-mono">{truncated}</span>
    </span>
  );
}
