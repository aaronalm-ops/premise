"use client";

import { useState } from "react";
import type {
  Brief,
  HypothesisStatus,
  Persona,
} from "@/lib/rag/types";

type Props = {
  brief: Brief | null;
  personas: Persona[];
  hasAcceptedHypotheses: boolean;
  onChange: () => void;
};

export function PersonasArtefact({
  brief,
  personas,
  hasAcceptedHypotheses,
  onChange,
}: Props) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!brief) return;
    if (personas.some((p) => p.status === "proposed")) {
      const ok = window.confirm(
        `Regenerate will delete the ${personas.filter((p) => p.status === "proposed").length} currently-proposed personas (accepted and rejected ones are kept). Continue?`,
      );
      if (!ok) return;
    }
    setGenerating(true);
    setError(null);
    try {
      const r = await fetch(`/api/briefs/${brief.id}/personas`, {
        method: "POST",
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `Generation failed (${r.status})`);
      onChange();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const acceptAllProposed = async () => {
    const proposed = personas.filter((p) => p.status === "proposed");
    if (proposed.length === 0) return;
    const ok = window.confirm(`Accept all ${proposed.length} proposed personas?`);
    if (!ok) return;
    await Promise.all(
      proposed.map((p) =>
        fetch(`/api/personas/${p.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "accepted" }),
        }),
      ),
    );
    onChange();
  };

  const buckets = {
    proposed: personas.filter((p) => p.status === "proposed"),
    accepted: personas.filter((p) => p.status === "accepted"),
    rejected: personas.filter((p) => p.status === "rejected"),
  };

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider">
            Personas
          </h3>
          <span className="text-[10px] text-[var(--color-muted-foreground)]">
            {personas.length === 0
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
              : personas.length === 0
                ? "Recommend personas"
                : "Regenerate proposed"}
          </button>
        </div>
      </div>

      <div className="space-y-3 px-4 py-3">
        {!brief && (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Save a brief first.
          </p>
        )}
        {brief && personas.length === 0 && !generating && (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {hasAcceptedHypotheses
              ? "No personas yet. The bot will use your accepted hypotheses + corpus to recommend 3-5."
              : "No personas yet. The bot can recommend from the brief alone, but accepting hypotheses first sharpens the recommendations."}
          </p>
        )}
        {generating && (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            <span className="animate-pulse">
              Reading brief, retrieving from corpus, proposing personas…
            </span>
          </p>
        )}
        {error && (
          <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
        )}

        {buckets.accepted.length > 0 && (
          <Section title="Accepted">
            {buckets.accepted.map((p) => (
              <PersonaCard key={p.id} p={p} onChange={onChange} />
            ))}
          </Section>
        )}
        {buckets.proposed.length > 0 && (
          <Section title="Proposed">
            {buckets.proposed.map((p) => (
              <PersonaCard key={p.id} p={p} onChange={onChange} />
            ))}
          </Section>
        )}
        {buckets.rejected.length > 0 && (
          <Section title="Rejected" muted>
            {buckets.rejected.map((p) => (
              <PersonaCard key={p.id} p={p} onChange={onChange} />
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

function PersonaCard({ p, onChange }: { p: Persona; onChange: () => void }) {
  const [busy, setBusy] = useState<HypothesisStatus | null>(null);
  const [expanded, setExpanded] = useState(false);

  const setStatus = async (status: HypothesisStatus) => {
    let rejection_reason: string | null = null;
    if (status === "rejected") {
      const input = window.prompt(
        "Why are you rejecting this persona? (optional)",
        "",
      );
      if (input === null) return;
      rejection_reason = input.trim() || null;
    }
    setBusy(status);
    try {
      const r = await fetch(`/api/personas/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejection_reason }),
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
            Priority {p.priority}/5
          </span>
          {p.provenance && <PersonaProvenanceChip provenance={p.provenance} />}
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)] hover:underline"
          >
            {expanded ? "hide" : "details"}
          </button>
        </div>
        <div className="flex shrink-0 gap-1">
          {p.status !== "accepted" && (
            <button
              onClick={() => setStatus("accepted")}
              disabled={busy !== null}
              className="rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
            >
              {busy === "accepted" ? "…" : "Accept"}
            </button>
          )}
          {p.status !== "rejected" && (
            <button
              onClick={() => setStatus("rejected")}
              disabled={busy !== null}
              className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-muted-foreground)]"
            >
              {busy === "rejected" ? "…" : "Reject"}
            </button>
          )}
          {p.status !== "proposed" && (
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

      <p className="mt-1.5 font-semibold leading-relaxed text-[var(--color-foreground)]">
        {p.name}
      </p>
      <p className="mt-0.5 leading-relaxed text-[var(--color-foreground)]">
        {p.description}
      </p>
      {p.under_represents && (
        <p className="mt-1.5 rounded border border-indigo-300 bg-indigo-50 px-2 py-1 text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-100">
          <span className="text-[10px] font-semibold uppercase tracking-wider">
            Under-represents:
          </span>{" "}
          {p.under_represents}
        </p>
      )}

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-[var(--color-border)] pt-2 text-[var(--color-muted-foreground)]">
          {p.demographic_profile && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider">
                Demographics
              </p>
              <p className="mt-0.5">{p.demographic_profile}</p>
            </div>
          )}
          {p.behavioural_profile && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider">
                Behaviours
              </p>
              <p className="mt-0.5">{p.behavioural_profile}</p>
            </div>
          )}
          {p.assumptions.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider">
                Assumptions to sanity-check
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {p.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}
          {p.supporting_chunk_ids.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider">
                Citations
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {p.supporting_chunk_ids.map((id) => (
                  <span
                    key={id}
                    className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-mono text-[10px] text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
                  >
                    {id.slice(0, 8)}
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

// D-055: persona provenance chip — same three tiers as hypothesis cards.
function PersonaProvenanceChip({
  provenance,
}: {
  provenance: "corpus-grounded" | "corpus-inspired" | "general-knowledge";
}) {
  const styles: Record<typeof provenance, { className: string; label: string; title: string }> = {
    "corpus-grounded": {
      className:
        "rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100",
      label: "From corpus",
      title:
        "D-055: corpus-grounded. The corpus directly describes this segment. Citations on the card.",
    },
    "corpus-inspired": {
      className:
        "rounded border border-sky-300 bg-sky-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-sky-900 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-100",
      label: "Inspired by corpus",
      title:
        "D-055: corpus-inspired. The persona extends a behavioural pattern from your corpus to this brief's target. Validate the extension.",
    },
    "general-knowledge": {
      className:
        "rounded border border-zinc-300 bg-zinc-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100",
      label: "General knowledge",
      title:
        "D-055: general-knowledge. Standard segmentation from background knowledge, not from your corpus. Validate against data before pitching.",
    },
  };
  const s = styles[provenance];
  return (
    <span className={s.className} title={s.title}>
      {s.label}
    </span>
  );
}
