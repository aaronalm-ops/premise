"use client";

import { useState } from "react";
import type {
  Brief,
  Hypothesis,
  HypothesisStatus,
} from "@/lib/rag/types";

type Props = {
  brief: Brief | null;
  hypotheses: Hypothesis[];
  onChange: () => void;
};

export function HypothesesArtefact({ brief, hypotheses, onChange }: Props) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!brief) return;
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

  const buckets = {
    proposed: hypotheses.filter((h) => h.status === "proposed"),
    accepted: hypotheses.filter((h) => h.status === "accepted"),
    rejected: hypotheses.filter((h) => h.status === "rejected"),
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
              <HypothesisCard key={h.id} h={h} onChange={onChange} />
            ))}
          </Section>
        )}

        {buckets.proposed.length > 0 && (
          <Section title="Proposed">
            {buckets.proposed.map((h) => (
              <HypothesisCard key={h.id} h={h} onChange={onChange} />
            ))}
          </Section>
        )}

        {buckets.rejected.length > 0 && (
          <Section title="Rejected" muted>
            {buckets.rejected.map((h) => (
              <HypothesisCard key={h.id} h={h} onChange={onChange} />
            ))}
          </Section>
        )}
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
  onChange,
}: {
  h: Hypothesis;
  onChange: () => void;
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
    setBusy(status);
    try {
      const r = await fetch(`/api/hypotheses/${h.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (r.ok) onChange();
    } finally {
      setBusy(null);
    }
  };

  const saveEdit = async () => {
    setBusy("save");
    try {
      const r = await fetch(`/api/hypotheses/${h.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statement: draftStatement,
          expected_direction: draftDirection || null,
          confirmation_criteria: draftCriteria || null,
        }),
      });
      if (r.ok) {
        setEditing(false);
        onChange();
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
