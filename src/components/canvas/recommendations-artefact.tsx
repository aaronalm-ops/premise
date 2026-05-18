"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  Brief,
  Hypothesis,
  HypothesisStatus,
  Recommendation,
} from "@/lib/rag/types";
import { GroundingDisclosure } from "./grounding-disclosure";

type Props = {
  brief: Brief | null;
  hypotheses: Hypothesis[];
  hasAcceptedHypotheses: boolean;
};

// The Recommendation artefact (D-039, taskforce critique 5a-5c).
// Sits between Analysis and Stories. Single decision-shaped output for
// a C-suite reader: causal insight + specific action + calibrated
// confidence + explicit caveats. "Propose-not-decide" still holds —
// up to 3 are generated; the researcher accepts one to feed the story
// generator.

export function RecommendationsArtefact({
  brief,
  hypotheses,
  hasAcceptedHypotheses,
}: Props) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!brief) {
      setRecommendations([]);
      return;
    }
    const r = await fetch(`/api/briefs/${brief.id}/recommendations`);
    const data = await r.json();
    setRecommendations((data.recommendations ?? []) as Recommendation[]);
  }, [brief]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const generate = async () => {
    if (!brief) return;
    if (recommendations.some((r) => r.status === "proposed")) {
      const ok = window.confirm(
        `Regenerate will delete the ${recommendations.filter((r) => r.status === "proposed").length} currently-proposed recommendation(s) (accepted and rejected ones are kept). Continue?`,
      );
      if (!ok) return;
    }
    setGenerating(true);
    setError(null);
    try {
      const r = await fetch(
        `/api/briefs/${brief.id}/recommendations/generate`,
        { method: "POST" },
      );
      const data = await r.json();
      if (!r.ok)
        throw new Error(data.error ?? `Generation failed (${r.status})`);
      refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const buckets = {
    proposed: recommendations.filter((r) => r.status === "proposed"),
    accepted: recommendations.filter((r) => r.status === "accepted"),
    rejected: recommendations.filter((r) => r.status === "rejected"),
  };

  const hypById = new Map(hypotheses.map((h) => [h.id, h]));

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider">
            Recommendation
          </h3>
          <span className="text-[10px] text-[var(--color-muted-foreground)]">
            {recommendations.length === 0
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
            : recommendations.length === 0
              ? "Generate recommendation"
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
            Accept at least one hypothesis before generating a recommendation.
          </p>
        )}
        {brief &&
          hasAcceptedHypotheses &&
          recommendations.length === 0 &&
          !generating && (
            <p className="text-xs text-[var(--color-muted-foreground)]">
              The single decision-shaped output a C-suite reader actually
              consumes: one causal insight, one specific action, one
              calibrated confidence. Premise will propose up to 3 — you
              accept the one to ladder the story angles up to.
            </p>
          )}
        {generating && (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            <span className="animate-pulse">
              Distilling verdicts and patterns into causal claims…
            </span>
          </p>
        )}
        {error && (
          <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
        )}

        {buckets.accepted.length > 0 && (
          <Section title="Accepted (feeds the story angles)">
            {buckets.accepted.map((r) => (
              <RecommendationCard
                key={r.id}
                rec={r}
                hypById={hypById}
                onChange={refresh}
              />
            ))}
          </Section>
        )}
        {buckets.proposed.length > 0 && (
          <Section title="Proposed">
            {buckets.proposed.map((r) => (
              <RecommendationCard
                key={r.id}
                rec={r}
                hypById={hypById}
                onChange={refresh}
              />
            ))}
          </Section>
        )}
        {buckets.rejected.length > 0 && (
          <Section title="Rejected" muted>
            {buckets.rejected.map((r) => (
              <RecommendationCard
                key={r.id}
                rec={r}
                hypById={hypById}
                onChange={refresh}
              />
            ))}
          </Section>
        )}

        {recommendations.length > 0 && (
          <GroundingDisclosure context="recommendations" />
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

function RecommendationCard({
  rec,
  hypById,
  onChange,
}: {
  rec: Recommendation;
  hypById: Map<string, Hypothesis>;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState<HypothesisStatus | "save" | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftInsight, setDraftInsight] = useState(rec.insight);
  const [draftAction, setDraftAction] = useState(rec.recommended_action);
  const [draftCaveats, setDraftCaveats] = useState(rec.caveats.join("\n"));
  const [expanded, setExpanded] = useState(false);

  const setStatus = async (status: HypothesisStatus) => {
    let rejection_reason: string | null = null;
    if (status === "rejected") {
      const input = window.prompt(
        "Why are you rejecting this recommendation? (optional)",
        "",
      );
      if (input === null) return;
      rejection_reason = input.trim() || null;
    }
    if (status === "accepted") {
      const otherAccepted = false; // we don't enforce single-accept here — the story generator just picks the first accepted at generate-time
      void otherAccepted;
    }
    setBusy(status);
    try {
      const r = await fetch(`/api/recommendations/${rec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejection_reason }),
      });
      if (r.ok) onChange();
    } finally {
      setBusy(null);
    }
  };

  const saveEdit = async () => {
    setBusy("save");
    try {
      const r = await fetch(`/api/recommendations/${rec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          insight: draftInsight,
          recommended_action: draftAction,
          caveats: draftCaveats
            .split("\n")
            .map((s) => s.trim())
            .filter((s) => s.length > 0),
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
    setDraftInsight(rec.insight);
    setDraftAction(rec.recommended_action);
    setDraftCaveats(rec.caveats.join("\n"));
    setEditing(true);
    setExpanded(true);
  };

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ConfidenceBadge confidence={rec.confidence} />
          {rec.requires_behavioral_validation && (
            <span
              className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100"
              title="D-051: This action would normally require behavioural-data validation before deployment (underwriting / pricing / hard-operational / regulatory class). The recommended action is a hypothesis to test, not a directive to ship — confidence is capped at medium until behavioural data confirms the mechanism."
            >
              Validate against behavioural data
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
          {rec.status !== "accepted" && (
            <button
              onClick={() => setStatus("accepted")}
              disabled={busy !== null}
              className="rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
            >
              {busy === "accepted" ? "…" : "Accept"}
            </button>
          )}
          {rec.status !== "rejected" && (
            <button
              onClick={() => setStatus("rejected")}
              disabled={busy !== null}
              className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-muted-foreground)]"
            >
              {busy === "rejected" ? "…" : "Reject"}
            </button>
          )}
          {rec.status !== "proposed" && (
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
              Insight (causal)
            </span>
            <textarea
              value={draftInsight}
              onChange={(e) => setDraftInsight(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-xs leading-relaxed"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Recommended action
            </span>
            <textarea
              value={draftAction}
              onChange={(e) => setDraftAction(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-xs leading-relaxed"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Caveats (one per line)
            </span>
            <textarea
              value={draftCaveats}
              onChange={(e) => setDraftCaveats(e.target.value)}
              rows={3}
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
              disabled={
                busy === "save" ||
                draftInsight.trim().length === 0 ||
                draftAction.trim().length === 0
              }
              className="rounded bg-[var(--color-foreground)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-background)] disabled:opacity-40"
            >
              {busy === "save" ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-1.5 font-semibold leading-relaxed text-[var(--color-foreground)]">
            {rec.insight}
          </p>
          <p className="mt-1.5 leading-relaxed text-[var(--color-foreground)]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
              So, do this:
            </span>{" "}
            {rec.recommended_action}
          </p>

          {rec.caveats.length > 0 && (
            <div className="mt-1.5 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
              <span className="text-[10px] font-semibold uppercase tracking-wider">
                Caveats
              </span>
              <ul className="mt-0.5 list-disc space-y-0.5 pl-4">
                {rec.caveats.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {expanded && !editing && (
        <div className="mt-3 space-y-2 border-t border-[var(--color-border)] pt-2 text-[var(--color-muted-foreground)]">
          {(rec.supporting_hypothesis_ids.length > 0 ||
            rec.supporting_emergent_patterns.length > 0) && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider">
                Evidence chain
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {rec.supporting_hypothesis_ids.map((id) => {
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
                {rec.supporting_emergent_patterns.map((p) => (
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
          {rec.rejection_reason && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider">
                Rejection reason
              </p>
              <p className="mt-0.5">{rec.rejection_reason}</p>
            </div>
          )}
        </div>
      )}
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
