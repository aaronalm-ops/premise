"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AnalysisSourceType,
  AnalysisWithData,
  Brief,
  Hypothesis,
} from "@/lib/rag/types";
import { GroundingDisclosure } from "./grounding-disclosure";

type Props = {
  brief: Brief | null;
  hypotheses: Hypothesis[];
  hasAcceptedHypotheses: boolean;
};

const SOURCE_LABELS: Record<AnalysisSourceType, string> = {
  csv: "CSV / Survey",
  transcript: "Transcript",
  paste: "Paste",
  notes: "Notes",
};

export function AnalysisArtefact({
  brief,
  hypotheses,
  hasAcceptedHypotheses,
}: Props) {
  const [analysis, setAnalysis] = useState<AnalysisWithData | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteContent, setPasteContent] = useState("");
  const [pasteType, setPasteType] = useState<AnalysisSourceType>("paste");
  const [adding, setAdding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    if (!brief) {
      setAnalysis(null);
      return;
    }
    const r = await fetch(`/api/briefs/${brief.id}/analysis`);
    const data = await r.json();
    setAnalysis(data.analysis);
  }, [brief]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const submitPaste = async () => {
    if (!brief || !pasteContent.trim() || !pasteTitle.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const r = await fetch(`/api/briefs/${brief.id}/analysis/data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_type: pasteType,
          title: pasteTitle.trim(),
          content: pasteContent,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `Add failed (${r.status})`);
      setPasteContent("");
      setPasteTitle("");
      setPasteOpen(false);
      refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAdding(false);
    }
  };

  const uploadFile = async (file: File) => {
    if (!brief) return;
    setAdding(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append(
        "source_type",
        file.name.toLowerCase().endsWith(".csv") ? "csv" : "transcript",
      );
      const r = await fetch(`/api/briefs/${brief.id}/analysis/data`, {
        method: "POST",
        body: form,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `Upload failed (${r.status})`);
      refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAdding(false);
    }
  };

  const removeData = async (dataId: string) => {
    if (!brief) return;
    await fetch(`/api/briefs/${brief.id}/analysis/data/${dataId}`, {
      method: "DELETE",
    });
    refresh();
  };

  const run = async () => {
    if (!brief) return;
    setRunning(true);
    setError(null);
    try {
      const r = await fetch(`/api/briefs/${brief.id}/analysis/run`, {
        method: "POST",
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `Run failed (${r.status})`);
      refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const hypById = new Map(hypotheses.map((h) => [h.id, h]));
  const hasData = (analysis?.data?.length ?? 0) > 0;
  const verdicts = analysis?.hypothesis_verdicts ?? [];
  const patterns = analysis?.emergent_patterns ?? [];
  const studyCaveats = analysis?.caveats ?? [];

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider">
            Analysis
          </h3>
          <span className="text-[10px] text-[var(--color-muted-foreground)]">
            {analysis?.status === "complete"
              ? `${verdicts.length} verdict${verdicts.length === 1 ? "" : "s"} · ${patterns.length} emergent`
              : analysis?.status === "running"
                ? "running…"
                : analysis?.status === "failed"
                  ? "last run failed"
                  : "not yet run"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.md,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/csv,text/plain,text/markdown"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadFile(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!brief || adding}
            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-[10px] font-medium uppercase tracking-wider disabled:opacity-40"
          >
            Upload
          </button>
          <button
            type="button"
            onClick={() => setPasteOpen((o) => !o)}
            disabled={!brief || adding}
            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-[10px] font-medium uppercase tracking-wider disabled:opacity-40"
          >
            Paste
          </button>
          <button
            type="button"
            onClick={run}
            disabled={!brief || !hasData || !hasAcceptedHypotheses || running}
            className="rounded-md border border-[var(--color-border)] px-3 py-1 text-[10px] font-medium uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-40"
          >
            {running
              ? "Analysing…"
              : analysis?.status === "complete"
                ? "Re-run"
                : "Run analysis"}
          </button>
        </div>
      </div>

      <div className="space-y-3 px-4 py-3">
        {!brief && (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Save a brief first.
          </p>
        )}
        {brief && !hasAcceptedHypotheses && (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Accept at least one hypothesis to enable analysis. Premise needs
            something to verdict against.
          </p>
        )}

        {pasteOpen && (
          <div className="space-y-2 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)] p-3">
            <div className="flex items-center gap-2">
              <select
                value={pasteType}
                onChange={(e) =>
                  setPasteType(e.target.value as AnalysisSourceType)
                }
                className="rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-[10px] uppercase tracking-wider"
              >
                {(Object.keys(SOURCE_LABELS) as AnalysisSourceType[]).map(
                  (k) => (
                    <option key={k} value={k}>
                      {SOURCE_LABELS[k]}
                    </option>
                  ),
                )}
              </select>
              <input
                type="text"
                value={pasteTitle}
                onChange={(e) => setPasteTitle(e.target.value)}
                placeholder="Title (e.g. 'Wave 1 survey export')"
                className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-xs"
              />
            </div>
            <textarea
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              placeholder="Paste raw data, transcript text, or notes…"
              rows={6}
              className="w-full resize-y rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5 text-xs leading-relaxed"
            />
            <div className="flex justify-end gap-1">
              <button
                onClick={() => setPasteOpen(false)}
                className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]"
              >
                Cancel
              </button>
              <button
                onClick={submitPaste}
                disabled={
                  adding ||
                  !pasteContent.trim() ||
                  !pasteTitle.trim()
                }
                className="rounded bg-[var(--color-foreground)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-background)] disabled:opacity-40"
              >
                {adding ? "Adding…" : "Add data"}
              </button>
            </div>
          </div>
        )}

        {hasData && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Data sources
            </p>
            <ul className="mt-1 space-y-1">
              {analysis!.data.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-1.5 text-xs"
                >
                  <div className="min-w-0 flex-1 truncate">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                      {SOURCE_LABELS[d.source_type]}
                    </span>{" "}
                    <span className="font-medium">{d.title}</span>
                    <span className="ml-1 text-[10px] opacity-60">
                      ({d.char_count.toLocaleString()} chars)
                    </span>
                  </div>
                  <button
                    onClick={() => removeData(d.id)}
                    className="rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
        )}
        {analysis?.status === "failed" && analysis.last_error && (
          <p className="text-xs text-red-700 dark:text-red-300">
            Last run failed: {analysis.last_error}
          </p>
        )}
        {running && (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            <span className="animate-pulse">
              Reading data, verdicting hypotheses, surfacing patterns…
            </span>
          </p>
        )}

        {verdicts.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Hypothesis verdicts
            </p>
            {verdicts.map((v, i) => {
              const h = hypById.get(v.hypothesis_id);
              return (
                <div
                  key={i}
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <VerdictBadge verdict={v.verdict} confidence={v.confidence} />
                    {h && (
                      <span className="text-[10px] text-[var(--color-muted-foreground)]">
                        H{h.ordinal + 1} · priority {h.priority}/5
                      </span>
                    )}
                  </div>
                  {h && (
                    <p className="mt-1 leading-relaxed text-[var(--color-foreground)]">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                        Hypothesis:
                      </span>{" "}
                      {h.statement}
                    </p>
                  )}
                  <p className="mt-1.5 font-medium text-[var(--color-foreground)]">
                    {v.summary}
                  </p>
                  <p className="mt-1 leading-relaxed text-[var(--color-muted-foreground)]">
                    {v.supporting_evidence}
                  </p>
                  {v.caveats.length > 0 && (
                    <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[var(--color-muted-foreground)]">
                      {v.caveats.map((c, ci) => (
                        <li key={ci}>{c}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {patterns.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Emergent patterns — what the data is shouting
            </p>
            {patterns
              .slice()
              .sort((a, b) => b.priority - a.priority)
              .map((p, i) => (
                <div
                  key={i}
                  className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs dark:border-emerald-900 dark:bg-emerald-950/30"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      Priority {p.priority}/5
                    </span>
                    <span className="font-semibold text-emerald-900 dark:text-emerald-100">
                      {p.pattern}
                    </span>
                  </div>
                  <p className="mt-1 leading-relaxed text-emerald-900 dark:text-emerald-100">
                    {p.description}
                  </p>
                  <p className="mt-1 text-emerald-800 dark:text-emerald-200">
                    <span className="text-[10px] font-semibold uppercase tracking-wider">
                      Evidence:
                    </span>{" "}
                    {p.evidence}
                  </p>
                  <p className="mt-1 text-emerald-800 dark:text-emerald-200">
                    <span className="text-[10px] font-semibold uppercase tracking-wider">
                      Why interesting:
                    </span>{" "}
                    {p.why_interesting}
                  </p>
                </div>
              ))}
          </div>
        )}

        {studyCaveats.length > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs dark:border-amber-900 dark:bg-amber-950/30">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-900 dark:text-amber-100">
              Study-wide caveats
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-amber-900 dark:text-amber-100">
              {studyCaveats.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        {(verdicts.length > 0 || patterns.length > 0) && (
          <GroundingDisclosure context="analysis" />
        )}
      </div>
    </div>
  );
}

function VerdictBadge({
  verdict,
  confidence,
}: {
  verdict: "confirmed" | "refuted" | "inconclusive";
  confidence: "high" | "medium" | "low";
}) {
  const v: Record<typeof verdict, string> = {
    confirmed: "text-emerald-700 dark:text-emerald-300",
    refuted: "text-red-700 dark:text-red-300",
    inconclusive: "text-amber-700 dark:text-amber-300",
  } as const;
  return (
    <div className="flex items-center gap-2">
      <span
        className={`text-[10px] font-semibold uppercase tracking-wider ${v[verdict]}`}
      >
        {verdict}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
        {confidence} confidence
      </span>
    </div>
  );
}
