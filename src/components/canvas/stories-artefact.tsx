"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  Brief,
  Hypothesis,
  HypothesisStatus,
  StoryAngle,
} from "@/lib/rag/types";
import { GroundingDisclosure } from "./grounding-disclosure";

type Props = {
  brief: Brief | null;
  hypotheses: Hypothesis[];
  hasAcceptedHypotheses: boolean;
};

export function StoriesArtefact({
  brief,
  hypotheses,
  hasAcceptedHypotheses,
}: Props) {
  const [angles, setAngles] = useState<StoryAngle[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!brief) {
      setAngles([]);
      return;
    }
    const r = await fetch(`/api/briefs/${brief.id}/stories`);
    const data = await r.json();
    setAngles((data.angles ?? []) as StoryAngle[]);
  }, [brief]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const generate = async () => {
    if (!brief) return;
    if (angles.some((a) => a.status === "proposed")) {
      const ok = window.confirm(
        `Regenerate will delete the ${angles.filter((a) => a.status === "proposed").length} currently-proposed angles (accepted and rejected ones are kept). Continue?`,
      );
      if (!ok) return;
    }
    setGenerating(true);
    setError(null);
    try {
      const r = await fetch(`/api/briefs/${brief.id}/stories/generate`, {
        method: "POST",
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `Generation failed (${r.status})`);
      refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const buckets = {
    proposed: angles.filter((a) => a.status === "proposed"),
    accepted: angles.filter((a) => a.status === "accepted"),
    rejected: angles.filter((a) => a.status === "rejected"),
  };

  const hypById = new Map(hypotheses.map((h) => [h.id, h]));

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider">
            Story angles
          </h3>
          <span className="text-[10px] text-[var(--color-muted-foreground)]">
            {angles.length === 0
              ? "none yet"
              : `${buckets.accepted.length} accepted · ${buckets.proposed.length} proposed · ${buckets.rejected.length} rejected`}
          </span>
        </div>
        <button
          onClick={generate}
          disabled={!brief || !hasAcceptedHypotheses || generating}
          className="rounded-md border border-[var(--color-border)] px-3 py-1 text-[10px] font-medium uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-40"
        >
          {generating
            ? "Generating…"
            : angles.length === 0
              ? "Generate angles"
              : "Regenerate proposed"}
        </button>
      </div>

      <div className="space-y-3 px-4 py-3">
        {!brief && (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Save a brief first.
          </p>
        )}
        {brief && !hasAcceptedHypotheses && (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Accept at least one hypothesis before generating story angles.
          </p>
        )}
        {brief && hasAcceptedHypotheses && angles.length === 0 && !generating && (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Premise will propose 3-4 narrative angles for the eventual deck /
            article / post. Each cites the hypotheses + emergent patterns it
            leans on, and names what it omits. You pick one to develop into
            an outline.
          </p>
        )}
        {generating && (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            <span className="animate-pulse">
              Reading verdicts, surfacing tensions, framing audiences…
            </span>
          </p>
        )}
        {error && (
          <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
        )}

        {buckets.accepted.length > 0 && (
          <Section title="Accepted (ready for outline)">
            {buckets.accepted.map((a) => (
              <AngleCard
                key={a.id}
                angle={a}
                hypById={hypById}
                onChange={refresh}
              />
            ))}
          </Section>
        )}
        {buckets.proposed.length > 0 && (
          <Section title="Proposed">
            {buckets.proposed.map((a) => (
              <AngleCard
                key={a.id}
                angle={a}
                hypById={hypById}
                onChange={refresh}
              />
            ))}
          </Section>
        )}
        {buckets.rejected.length > 0 && (
          <Section title="Rejected" muted>
            {buckets.rejected.map((a) => (
              <AngleCard
                key={a.id}
                angle={a}
                hypById={hypById}
                onChange={refresh}
              />
            ))}
          </Section>
        )}

        {angles.length > 0 && <GroundingDisclosure context="angles" />}
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

function AngleCard({
  angle,
  hypById,
  onChange,
}: {
  angle: StoryAngle;
  hypById: Map<string, Hypothesis>;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setStatus = async (status: HypothesisStatus) => {
    let rejection_reason: string | null = null;
    if (status === "rejected") {
      const input = window.prompt(
        "Why are you rejecting this angle? (optional)",
        "",
      );
      if (input === null) return;
      rejection_reason = input.trim() || null;
    }
    setBusy(status);
    try {
      const r = await fetch(`/api/stories/${angle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejection_reason }),
      });
      if (r.ok) onChange();
    } finally {
      setBusy(null);
    }
  };

  const draft = async () => {
    setDrafting(true);
    setError(null);
    try {
      const r = await fetch(`/api/stories/${angle.id}/draft`, {
        method: "POST",
      });
      const data = await r.json();
      if (!r.ok)
        throw new Error(data.error ?? `Draft failed (${r.status})`);
      onChange();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDrafting(false);
    }
  };

  const copyOutline = async () => {
    if (!angle.draft_outline) return;
    await navigator.clipboard.writeText(angle.draft_outline);
  };

  const downloadOutline = () => {
    if (!angle.draft_outline) return;
    const blob = new Blob([angle.draft_outline], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${angle.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
            Priority {angle.priority}/5
          </span>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)] hover:underline"
          >
            {expanded ? "hide" : "details"}
          </button>
        </div>
        <div className="flex shrink-0 gap-1">
          {angle.status !== "accepted" && (
            <button
              onClick={() => setStatus("accepted")}
              disabled={busy !== null}
              className="rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
            >
              {busy === "accepted" ? "…" : "Accept"}
            </button>
          )}
          {angle.status !== "rejected" && (
            <button
              onClick={() => setStatus("rejected")}
              disabled={busy !== null}
              className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-muted-foreground)]"
            >
              {busy === "rejected" ? "…" : "Reject"}
            </button>
          )}
          {angle.status !== "proposed" && (
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
        {angle.title}
      </p>
      <p className="mt-0.5 text-[var(--color-muted-foreground)]">
        For: <span className="text-[var(--color-foreground)]">{angle.target_audience}</span>
      </p>
      <p className="mt-1 italic text-[var(--color-foreground)]">{angle.lede}</p>

      <div className="mt-1.5 rounded border border-indigo-300 bg-indigo-50 px-2 py-1 text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-100">
        <span className="text-[10px] font-semibold uppercase tracking-wider">
          Deliberately leaves out
        </span>
        <span className="ml-1 text-[10px] opacity-80">(address or own it):</span>{" "}
        {angle.omits}
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-[var(--color-border)] pt-2 text-[var(--color-muted-foreground)]">
          {angle.beats.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider">
                Beats
              </p>
              <ul className="mt-1 list-decimal space-y-1 pl-5">
                {angle.beats.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}
          {(angle.supporting_hypothesis_ids.length > 0 ||
            angle.supporting_emergent_patterns.length > 0) && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider">
                Evidence chain
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {angle.supporting_hypothesis_ids.map((id) => {
                  const h = hypById.get(id);
                  return (
                    <span
                      key={id}
                      className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
                      title={h?.statement ?? id}
                    >
                      H{h ? h.ordinal + 1 : "?"}
                    </span>
                  );
                })}
                {angle.supporting_emergent_patterns.map((p) => (
                  <span
                    key={p}
                    className="rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-0.5 text-[10px]"
                    title={p}
                  >
                    pattern: {p.length > 28 ? p.slice(0, 28) + "…" : p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {angle.status === "accepted" && (
        <div className="mt-3 border-t border-[var(--color-border)] pt-2">
          {!angle.draft_outline && (
            <button
              onClick={draft}
              disabled={drafting}
              className="rounded-md bg-[var(--color-foreground)] px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-[var(--color-background)] disabled:opacity-40"
            >
              {drafting ? "Drafting outline…" : "Draft outline"}
            </button>
          )}
          {error && (
            <p className="mt-1 text-[10px] text-red-700 dark:text-red-300">
              {error}
            </p>
          )}
          {angle.draft_outline && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  Draft outline
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={draft}
                    disabled={drafting}
                    className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[10px] uppercase tracking-wider"
                  >
                    {drafting ? "…" : "Re-draft"}
                  </button>
                  <button
                    onClick={copyOutline}
                    className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[10px] uppercase tracking-wider"
                  >
                    Copy
                  </button>
                  <button
                    onClick={downloadOutline}
                    className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[10px] uppercase tracking-wider"
                  >
                    Download .md
                  </button>
                </div>
              </div>
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[11px] leading-relaxed text-[var(--color-foreground)]">
                {angle.draft_outline}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
