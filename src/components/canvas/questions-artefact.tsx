"use client";

import { useState } from "react";
import type {
  Brief,
  Hypothesis,
  HypothesisStatus,
  QuestionVariant,
  QuestionWithVariants,
  VariantType,
} from "@/lib/rag/types";

type Props = {
  brief: Brief | null;
  hypotheses: Hypothesis[];
  questions: QuestionWithVariants[];
  hasAcceptedHypotheses: boolean;
  onChange: () => void;
};

const VARIANT_LABELS: Record<VariantType, string> = {
  neutral_direct: "Neutral",
  leading: "Leading",
  projective: "Projective",
  behavioural: "Behavioural",
  attitudinal: "Attitudinal",
  forced_choice: "Forced choice",
  constant_sum: "Constant sum",
  maxdiff: "MaxDiff",
};

export function QuestionsArtefact({
  brief,
  hypotheses,
  questions,
  hasAcceptedHypotheses,
  onChange,
}: Props) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!brief) return;
    setGenerating(true);
    setError(null);
    try {
      const r = await fetch(`/api/briefs/${brief.id}/questions`, {
        method: "POST",
      });
      const data = await r.json();
      if (!r.ok)
        throw new Error(data.error ?? `Generation failed (${r.status})`);
      onChange();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const hypothesisById = new Map(hypotheses.map((h) => [h.id, h]));

  const buckets = {
    proposed: questions.filter((q) => q.status === "proposed"),
    accepted: questions.filter((q) => q.status === "accepted"),
    rejected: questions.filter((q) => q.status === "rejected"),
  };

  const exportable = buckets.accepted.filter((q) => q.selected_variant_id !== null);
  const canExport = !!brief && exportable.length > 0;

  const triggerExport = (format: "markdown" | "qualtrics" | "plaintext") => {
    if (!brief) return;
    const url = `/api/briefs/${brief.id}/export?format=${format}&download=1`;
    window.location.href = url;
  };

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider">
            Questionnaire
          </h3>
          <span className="text-[10px] text-[var(--color-muted-foreground)]">
            {questions.length === 0
              ? "none yet"
              : `${buckets.accepted.length} accepted · ${buckets.proposed.length} proposed · ${buckets.rejected.length} rejected · ${exportable.length} ready to export`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => triggerExport("markdown")}
            disabled={!canExport}
            title={
              canExport
                ? "Download accepted questions with selected variants"
                : "Accept at least one question and pick a variant"
            }
            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-[10px] font-medium uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-40"
          >
            Export .md
          </button>
          <button
            onClick={() => triggerExport("qualtrics")}
            disabled={!canExport}
            title="Qualtrics-compatible advanced format"
            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-[10px] font-medium uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-40"
          >
            Qualtrics
          </button>
          <button
            onClick={generate}
            disabled={!brief || !hasAcceptedHypotheses || generating}
            className="rounded-md border border-[var(--color-border)] px-3 py-1 text-[10px] font-medium uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-40"
          >
            {generating
              ? "Drafting…"
              : questions.length === 0
                ? "Draft questionnaire"
                : "Redraft proposed"}
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
            Accept at least one hypothesis to enable questionnaire drafting.
          </p>
        )}
        {brief && hasAcceptedHypotheses && questions.length === 0 && !generating && (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            No questions yet. The bot will draft 4-8 questions, each with
            <strong> 3 phrasing variants</strong>. You pick one variant per
            question based on what you want to elicit.
          </p>
        )}
        {generating && (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            <span className="animate-pulse">
              Composing questions and methodological variants…
            </span>
          </p>
        )}
        {error && (
          <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
        )}

        {buckets.accepted.length > 0 && (
          <Section title="Accepted">
            {buckets.accepted.map((q) => (
              <QuestionCard
                key={q.id}
                q={q}
                hypothesis={
                  q.hypothesis_id ? hypothesisById.get(q.hypothesis_id) : undefined
                }
                onChange={onChange}
              />
            ))}
          </Section>
        )}
        {buckets.proposed.length > 0 && (
          <Section title="Proposed">
            {buckets.proposed.map((q) => (
              <QuestionCard
                key={q.id}
                q={q}
                hypothesis={
                  q.hypothesis_id ? hypothesisById.get(q.hypothesis_id) : undefined
                }
                onChange={onChange}
              />
            ))}
          </Section>
        )}
        {buckets.rejected.length > 0 && (
          <Section title="Rejected" muted>
            {buckets.rejected.map((q) => (
              <QuestionCard
                key={q.id}
                q={q}
                hypothesis={
                  q.hypothesis_id ? hypothesisById.get(q.hypothesis_id) : undefined
                }
                onChange={onChange}
              />
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

function QuestionCard({
  q,
  hypothesis,
  onChange,
}: {
  q: QuestionWithVariants;
  hypothesis: Hypothesis | undefined;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState<HypothesisStatus | "select" | null>(null);

  const setStatus = async (status: HypothesisStatus) => {
    setBusy(status);
    try {
      const r = await fetch(`/api/questions/${q.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (r.ok) onChange();
    } finally {
      setBusy(null);
    }
  };

  const selectVariant = async (variantId: string | null) => {
    setBusy("select");
    try {
      const r = await fetch(`/api/questions/${q.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected_variant_id: variantId }),
      });
      if (r.ok) onChange();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
            Q{q.ordinal + 1}
          </span>
          {hypothesis && (
            <span
              className="text-[10px] text-[var(--color-muted-foreground)]"
              title={hypothesis.statement}
            >
              tests H{hypothesis.ordinal + 1}
            </span>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          {q.status !== "accepted" && (
            <button
              onClick={() => setStatus("accepted")}
              disabled={busy !== null}
              className="rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
            >
              {busy === "accepted" ? "…" : "Accept"}
            </button>
          )}
          {q.status !== "rejected" && (
            <button
              onClick={() => setStatus("rejected")}
              disabled={busy !== null}
              className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-muted-foreground)]"
            >
              {busy === "rejected" ? "…" : "Reject"}
            </button>
          )}
        </div>
      </div>

      <p className="mt-1.5 font-semibold leading-relaxed text-[var(--color-foreground)]">
        {q.target_construct}
      </p>
      {q.rationale && (
        <p className="mt-0.5 leading-relaxed text-[var(--color-muted-foreground)]">
          {q.rationale}
        </p>
      )}

      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
        {q.variants.map((v) => (
          <VariantCard
            key={v.id}
            v={v}
            selected={q.selected_variant_id === v.id}
            onSelect={() =>
              selectVariant(q.selected_variant_id === v.id ? null : v.id)
            }
            onEdited={onChange}
            disabled={busy !== null}
          />
        ))}
      </div>
    </div>
  );
}

function VariantCard({
  v,
  selected,
  onSelect,
  onEdited,
  disabled,
}: {
  v: QuestionVariant;
  selected: boolean;
  onSelect: () => void;
  onEdited: () => void;
  disabled: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(v.statement);
  const [saving, setSaving] = useState(false);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraft(v.statement);
    setEditing(true);
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(false);
  };

  const save = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSaving(true);
    try {
      const r = await fetch(`/api/question-variants/${v.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statement: draft }),
      });
      if (r.ok) {
        setEditing(false);
        onEdited();
      }
    } finally {
      setSaving(false);
    }
  };

  const baseClass = `flex flex-col gap-1.5 rounded-md border px-3 py-2 text-left transition ${
    selected
      ? "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30"
      : "border-[var(--color-border)] bg-[var(--color-background)] hover:border-[var(--color-foreground)]/30"
  }`;

  if (editing) {
    return (
      <div className={baseClass}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
            {VARIANT_LABELS[v.variant_type]} · editing
          </span>
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          onClick={(e) => e.stopPropagation()}
          className="w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-xs leading-relaxed"
        />
        <div className="flex justify-end gap-1">
          <button
            type="button"
            onClick={cancelEdit}
            disabled={saving}
            className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || draft.trim().length === 0}
            className="rounded bg-[var(--color-foreground)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-background)] disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`${baseClass} ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
          {VARIANT_LABELS[v.variant_type]}
        </span>
        <div className="flex items-center gap-1">
          {selected && (
            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
              SELECTED
            </span>
          )}
          <span
            role="button"
            tabIndex={0}
            onClick={startEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") startEdit(e as never);
            }}
            className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)] hover:underline"
          >
            edit
          </span>
        </div>
      </div>
      <p className="leading-relaxed text-[var(--color-foreground)]">
        {v.statement}
      </p>
      {v.response_format && (
        <p className="text-[10px] font-mono text-[var(--color-muted-foreground)]">
          {v.response_format}
        </p>
      )}
      {v.response_options.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-4 text-[var(--color-muted-foreground)]">
          {v.response_options.map((opt, i) => (
            <li key={i}>{opt}</li>
          ))}
        </ul>
      )}
      {v.what_it_elicits && (
        <div className="rounded bg-[var(--color-muted)] px-2 py-1 text-[var(--color-muted-foreground)]">
          <span className="text-[10px] font-semibold uppercase tracking-wider">
            Elicits:
          </span>{" "}
          {v.what_it_elicits}
        </div>
      )}
      {v.caveat && (
        <div className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
          <span className="text-[10px] font-semibold uppercase tracking-wider">
            Caveat:
          </span>{" "}
          {v.caveat}
        </div>
      )}
    </button>
  );
}
