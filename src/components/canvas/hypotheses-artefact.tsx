"use client";

import { useEffect, useState } from "react";
import type {
  Brief,
  Hypothesis,
  HypothesisStatus,
} from "@/lib/rag/types";
import { GroundingDisclosure } from "./grounding-disclosure";

type Props = {
  brief: Brief | null;
  hypotheses: Hypothesis[];
  onChange: () => void;
};

// D-048 (closes D-8): optimistic-update override map. Cards call
// applyOptimistic(id, patch) before kicking off the PATCH; the card moves
// buckets immediately. Once the parent refresh completes, the server state
// supersedes the override.
type OptimisticOverride = Partial<Pick<Hypothesis, "status">>;

export function HypothesesArtefact({ brief, hypotheses, onChange }: Props) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<
    Record<string, OptimisticOverride>
  >({});
  // D-041: tracks whether an analysis exists on this brief — gates the
  // post-analysis-revision rationale prompt on accepted hypotheses.
  const [hasAnalysis, setHasAnalysis] = useState(false);

  useEffect(() => {
    if (!brief) {
      setHasAnalysis(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/briefs/${brief.id}/analysis`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setHasAnalysis(Boolean(data?.analysis));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [brief, hypotheses]);

  const generate = async () => {
    if (!brief) return;
    // U-8: confirmation on destructive regenerate. Existing proposed
    // hypotheses are deleted; accepted/rejected survive.
    if (hypotheses.some((h) => h.status === "proposed")) {
      const ok = window.confirm(
        `Regenerate will delete the ${hypotheses.filter((h) => h.status === "proposed").length} currently-proposed hypotheses (accepted and rejected ones are kept). Continue?`,
      );
      if (!ok) return;
    }
    setGenerating(true);
    setError(null);
    try {
      const r = await fetch(`/api/briefs/${brief.id}/hypotheses`, {
        method: "POST",
      });
      const data = await r.json();
      if (!r.ok) {
        throw new Error(data.error ?? `Generation failed (${r.status})`);
      }
      onChange();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const acceptAllProposed = async () => {
    if (buckets.proposed.length === 0) return;
    const ok = window.confirm(
      `Accept all ${buckets.proposed.length} proposed hypotheses?`,
    );
    if (!ok) return;
    await Promise.all(
      buckets.proposed.map((h) =>
        fetch(`/api/hypotheses/${h.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "accepted" }),
        }),
      ),
    );
    onChange();
  };

  const effective = hypotheses.map((h) => ({ ...h, ...(overrides[h.id] ?? {}) }));
  const buckets = {
    proposed: effective.filter((h) => h.status === "proposed"),
    accepted: effective.filter((h) => h.status === "accepted"),
    rejected: effective.filter((h) => h.status === "rejected"),
  };

  const applyOptimistic = (id: string, patch: OptimisticOverride) => {
    setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };
  const clearOptimistic = (id: string) => {
    setOverrides((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };
  const refreshAndClear = (id: string) => {
    onChange();
    clearOptimistic(id);
  };

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider">
            Hypotheses
          </h3>
          <span className="text-[10px] text-[var(--color-muted-foreground)]">
            {hypotheses.length === 0
              ? "none yet"
              : `${buckets.accepted.length} accepted · ${buckets.proposed.length} proposed · ${buckets.rejected.length} rejected`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {buckets.proposed.length > 1 && (
            <button
              onClick={acceptAllProposed}
              className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
            >
              Accept all
            </button>
          )}
          <button
            onClick={generate}
            disabled={!brief || generating}
            className="rounded-md border border-[var(--color-border)] px-3 py-1 text-[10px] font-medium uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-40"
          >
            {generating
              ? "Generating…"
              : hypotheses.length === 0
                ? "Generate hypotheses"
                : "Regenerate proposed"}
          </button>
        </div>
      </div>

      <div className="space-y-3 px-4 py-3">
        {!brief && (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Save a brief above to enable hypothesis generation.
          </p>
        )}

        {brief && hypotheses.length === 0 && !generating && (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            No hypotheses yet. Click <strong>Generate hypotheses</strong> to
            propose 5–7 ranked options grounded in your corpus.
          </p>
        )}

        {generating && (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            <span className="animate-pulse">
              Premise is reading the brief, retrieving from your corpus,
              proposing hypotheses…
            </span>
          </p>
        )}

        {error && (
          <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
        )}

        {buckets.accepted.length > 0 && (
          <Section title="Accepted">
            {buckets.accepted.map((h) => (
              <HypothesisCard
                key={h.id}
                h={h}
                hasAnalysis={hasAnalysis}
                onChange={onChange}
                onOptimistic={applyOptimistic}
                onSettled={refreshAndClear}
              />
            ))}
          </Section>
        )}

        {buckets.proposed.length > 0 && (
          <Section title="Proposed">
            {buckets.proposed.map((h) => (
              <HypothesisCard
                key={h.id}
                h={h}
                hasAnalysis={hasAnalysis}
                onChange={onChange}
                onOptimistic={applyOptimistic}
                onSettled={refreshAndClear}
              />
            ))}
          </Section>
        )}

        {buckets.rejected.length > 0 && (
          <Section title="Rejected" muted>
            {buckets.rejected.map((h) => (
              <HypothesisCard
                key={h.id}
                h={h}
                hasAnalysis={hasAnalysis}
                onChange={onChange}
                onOptimistic={applyOptimistic}
                onSettled={refreshAndClear}
              />
            ))}
          </Section>
        )}

        {hypotheses.length > 0 && <GroundingDisclosure context="hypotheses" />}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  muted,
}: {
  title: string;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className={`space-y-2 ${muted ? "opacity-60" : ""}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
        {title}
      </p>
      {children}
    </div>
  );
}

function HypothesisCard({
  h,
  hasAnalysis,
  onChange,
  onOptimistic,
  onSettled,
}: {
  h: Hypothesis;
  hasAnalysis: boolean;
  onChange: () => void;
  onOptimistic: (id: string, patch: OptimisticOverride) => void;
  onSettled: (id: string) => void;
}) {
  const [busy, setBusy] = useState<HypothesisStatus | "save" | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftStatement, setDraftStatement] = useState(h.statement);
  const [draftDirection, setDraftDirection] = useState(
    h.expected_direction ?? "",
  );
  const [draftCriteria, setDraftCriteria] = useState(
    h.confirmation_criteria ?? "",
  );

  const setStatus = async (status: HypothesisStatus) => {
    // P-2: capture optional rejection reason. null = user cancelled, "" = submit blank.
    let rejection_reason: string | null | undefined;
    if (status === "rejected") {
      const input = window.prompt(
        "Why are you rejecting this hypothesis? (optional — leave blank to skip; helps Premise tune over time)",
        "",
      );
      if (input === null) return; // cancelled
      rejection_reason = input.trim() || null;
    } else {
      // Clear any previous rejection reason if un-rejecting.
      rejection_reason = null;
    }
    setBusy(status);
    // D-048: optimistic move into the destination bucket immediately.
    onOptimistic(h.id, { status });
    try {
      const r = await fetch(`/api/hypotheses/${h.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejection_reason }),
      });
      if (r.ok) onSettled(h.id);
    } finally {
      setBusy(null);
    }
  };

  const saveEdit = async () => {
    // D-041: post-analysis revision discipline. If this hypothesis is
    // accepted AND an analysis has run on this brief AND the user is
    // changing a structural field, require a deviation rationale. We catch
    // the case client-side for UX (so the user knows BEFORE hitting save);
    // the API still enforces it regardless.
    const structuralEdit =
      draftStatement.trim() !== h.statement.trim() ||
      (draftDirection || null) !== (h.expected_direction ?? null) ||
      (draftCriteria || null) !== (h.confirmation_criteria ?? null);

    let revisionRationale: string | undefined;
    if (structuralEdit && h.status === "accepted" && hasAnalysis) {
      const note = window.prompt(
        "Analysis already exists on this brief. Revising an accepted hypothesis post-analysis is a deviation from pre-registered hypotheses (D-041).\n\nName WHY this revision is necessary. The rationale will be surfaced on the card and auto-appended to any story angle that leans on this hypothesis.",
        "",
      );
      if (note === null) return; // cancelled
      const trimmed = note.trim();
      if (trimmed.length === 0) {
        window.alert(
          "A non-empty rationale is required to revise an accepted hypothesis post-analysis.",
        );
        return;
      }
      revisionRationale = trimmed;
    }

    setBusy("save");
    try {
      const r = await fetch(`/api/hypotheses/${h.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statement: draftStatement,
          expected_direction: draftDirection || null,
          confirmation_criteria: draftCriteria || null,
          ...(revisionRationale ? { revision_rationale: revisionRationale } : {}),
        }),
      });
      if (r.ok) {
        setEditing(false);
        onChange();
      } else {
        const data = await r.json().catch(() => ({}));
        window.alert(data.error ?? `Save failed (${r.status})`);
      }
    } finally {
      setBusy(null);
    }
  };

  const startEdit = () => {
    setDraftStatement(h.statement);
    setDraftDirection(h.expected_direction ?? "");
    setDraftCriteria(h.confirmation_criteria ?? "");
    setEditing(true);
    setExpanded(true);
  };

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PriorityBadge priority={h.priority} />
          {h.revised_after_analysis && (
            <span
              className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100"
              title={
                h.revision_rationale
                  ? `Deviation rationale: ${h.revision_rationale}`
                  : "Revised after analysis ran"
              }
            >
              Revised post-analysis
            </span>
          )}
          {(h.scope_inherited_from === "corpus" ||
            h.scope_inherited_from === "model_default") && (
            <span
              className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100"
              title={
                h.scope_inherited_from === "corpus"
                  ? "Scope inherited from corpus skew rather than the brief or your clarifications. Review the statement before accepting (D-049)."
                  : "Scope not traceable to brief, clarifications, or corpus. The model defaulted. Review the statement before accepting (D-049)."
              }
            >
              Scope: {h.scope_inherited_from === "corpus" ? "from corpus" : "model default"}
            </span>
          )}
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)] hover:underline"
          >
            {expanded ? "hide" : "details"}
          </button>
          {!editing && (
            <button
              onClick={startEdit}
              className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)] hover:underline"
            >
              edit
            </button>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          {h.status !== "accepted" && (
            <button
              onClick={() => setStatus("accepted")}
              disabled={busy !== null}
              className="rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
            >
              {busy === "accepted" ? "…" : "Accept"}
            </button>
          )}
          {h.status !== "rejected" && (
            <button
              onClick={() => setStatus("rejected")}
              disabled={busy !== null}
              className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-muted-foreground)]"
            >
              {busy === "rejected" ? "…" : "Reject"}
            </button>
          )}
          {h.status !== "proposed" && (
            <button
              onClick={() => setStatus("proposed")}
              disabled={busy !== null}
              className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-muted-foreground)]"
            >
              {busy === "proposed" ? "…" : "Reset"}
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="mt-2 space-y-2">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Statement
            </span>
            <textarea
              value={draftStatement}
              onChange={(e) => setDraftStatement(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-xs leading-relaxed"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Expected direction
            </span>
            <textarea
              value={draftDirection}
              onChange={(e) => setDraftDirection(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-xs leading-relaxed"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Confirmation criteria
            </span>
            <textarea
              value={draftCriteria}
              onChange={(e) => setDraftCriteria(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-xs leading-relaxed"
            />
          </label>
          <div className="flex justify-end gap-1">
            <button
              onClick={() => setEditing(false)}
              disabled={busy === "save"}
              className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]"
            >
              Cancel
            </button>
            <button
              onClick={saveEdit}
              disabled={busy === "save" || draftStatement.trim().length === 0}
              className="rounded bg-[var(--color-foreground)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-background)] disabled:opacity-40"
            >
              {busy === "save" ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-1.5 leading-relaxed text-[var(--color-foreground)]">
          {h.statement}
        </p>
      )}

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-[var(--color-border)] pt-2 text-[var(--color-muted-foreground)]">
          {h.assumptions.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider">
                Assumptions
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {h.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}
          {h.expected_direction && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider">
                Expected direction
              </p>
              <p className="mt-0.5">{h.expected_direction}</p>
            </div>
          )}
          {h.confirmation_criteria && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider">
                Confirmation criteria
              </p>
              <p className="mt-0.5">{h.confirmation_criteria}</p>
            </div>
          )}
          {h.revised_after_analysis && h.revision_rationale && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                Revision rationale (deviation report)
              </p>
              <p className="mt-0.5">{h.revision_rationale}</p>
            </div>
          )}
          {(h.supporting_chunk_ids.length > 0 ||
            h.contradicting_chunk_ids.length > 0) && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider">
                Citations
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {h.supporting_chunk_ids.map((id) => (
                  <span
                    key={id}
                    className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-mono text-[10px] text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
                  >
                    + {id.slice(0, 8)}
                  </span>
                ))}
                {h.contradicting_chunk_ids.map((id) => (
                  <span
                    key={id}
                    className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 font-mono text-[10px] text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100"
                  >
                    − {id.slice(0, 8)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: 1 | 2 | 3 | 4 | 5 }) {
  const colors: Record<number, string> = {
    5: "text-emerald-700 dark:text-emerald-300",
    4: "text-emerald-700 dark:text-emerald-300",
    3: "text-amber-700 dark:text-amber-300",
    2: "text-zinc-500 dark:text-zinc-400",
    1: "text-zinc-500 dark:text-zinc-400",
  };
  return (
    <span
      className={`text-[10px] font-semibold uppercase tracking-wider ${colors[priority]}`}
    >
      Priority {priority}/5
    </span>
  );
}
