"use client";

// D-049: Layer 1 of the brief-scope discipline as a UI surface.
//
// Lives between the Brief and Hypotheses artefacts. Triggers when the
// researcher clicks "Generate hypotheses" on a brief that hasn't been
// scope-checked, or on a brief whose scope-check returned a pending status.
//
// Conversational design (per the Sam — Conversational AI Designer voice in
// the taskforce synthesis): each unresolved axis gets quick-reply chips +
// a free-text fallback + a "Skip — keep this axis open" option.

import { useEffect, useState } from "react";
import type {
  Brief,
  ScopeAxis,
  ScopeClarifications,
  ScopeDimensions,
} from "@/lib/rag/types";

type DetectResponse = {
  dimensions: ScopeDimensions | null;
  clarifications: ScopeClarifications | null;
  status: "not_required" | "pending" | "answered" | "skipped" | null;
  skew: Partial<Record<ScopeAxis, { dominant: string; share: number }>>;
  nudge_axes: ScopeAxis[];
};

type Props = {
  brief: Brief | null;
  onResolved: () => void; // parent refreshes brief after the clarifier resolves
};

const AXIS_LABELS: Record<ScopeAxis, string> = {
  geography: "Region",
  time_horizon: "Time horizon",
  audience: "Audience",
  channel: "Channel",
  market_maturity: "Market maturity",
};

const AXIS_QUESTIONS: Record<ScopeAxis, string> = {
  geography:
    "Your brief doesn't specify a region. How should I scope?",
  time_horizon:
    "Your brief doesn't specify a time horizon. What window are we looking at?",
  audience:
    "Your brief doesn't pin an audience. Who should I focus on?",
  channel:
    "Your brief doesn't specify a channel or platform. Which one matters?",
  market_maturity:
    "Your brief doesn't fix a market-maturity stage. What lifecycle are we in?",
};

// Quick-reply chips per axis. The corpus's dominant value (if any) is
// surfaced as an opt-in, not a default — clicking it is an explicit choice.
function chipsForAxis(
  axis: ScopeAxis,
  dominant: string | null,
): { value: string; label: string }[] {
  const base: Record<ScopeAxis, { value: string; label: string }[]> = {
    geography: [
      { value: "global", label: "Keep global" },
    ],
    time_horizon: [
      { value: "last 12 months", label: "Last 12 months" },
      { value: "3-5 year trend", label: "3-5 year trend" },
    ],
    audience: [
      { value: "all consumers", label: "Keep broad" },
    ],
    channel: [
      { value: "channel-agnostic", label: "Channel-agnostic" },
    ],
    market_maturity: [
      { value: "any maturity", label: "Any maturity" },
    ],
  };
  const chips = [...base[axis]];
  if (dominant) {
    chips.push({ value: dominant, label: `Match my corpus (${dominant})` });
  }
  return chips;
}

export function ScopeClarifier({ brief, onResolved }: Props) {
  const [state, setState] = useState<DetectResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingAxis, setSavingAxis] = useState<ScopeAxis | null>(null);
  const [customDraft, setCustomDraft] = useState<Partial<Record<ScopeAxis, string>>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setState(null);
    setCustomDraft({});
    setError(null);
    setCollapsed(false);
    if (!brief) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/briefs/${brief.id}/scope`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setState({
          dimensions: data.dimensions ?? null,
          clarifications: data.clarifications ?? null,
          status: data.status ?? null,
          skew: data.skew ?? {},
          nudge_axes: data.nudge_axes ?? [],
        });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [brief?.id]);

  const runDetection = async () => {
    if (!brief) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/briefs/${brief.id}/scope/detect`, {
        method: "POST",
      });
      const data = (await r.json()) as DetectResponse;
      if (!r.ok) {
        throw new Error((data as unknown as { error?: string }).error ?? "detect failed");
      }
      setState(data);
      onResolved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const answer = async (axis: ScopeAxis, value: string) => {
    if (!brief || !state) return;
    setSavingAxis(axis);
    setError(null);
    try {
      const nextClarifications: ScopeClarifications = {
        ...(state.clarifications ?? {}),
        [axis]: value,
      };
      const stillPending = state.nudge_axes.filter(
        (a) => a !== axis && nextClarifications[a] === undefined,
      );
      const status: DetectResponse["status"] =
        stillPending.length === 0 ? "answered" : "pending";
      const r = await fetch(`/api/briefs/${brief.id}/scope`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clarifications: nextClarifications,
          status,
        }),
      });
      if (!r.ok) {
        const data = await r.json();
        throw new Error(data.error ?? "save failed");
      }
      setState({
        ...state,
        clarifications: nextClarifications,
        status,
        nudge_axes: stillPending,
      });
      setCustomDraft((d) => ({ ...d, [axis]: undefined }));
      onResolved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingAxis(null);
    }
  };

  if (!brief) return null;

  const needsDetectionRun =
    state &&
    (state.status === null || state.dimensions === null);

  const unresolvedAxes = state?.nudge_axes ?? [];
  const allResolved =
    state?.status === "answered" ||
    state?.status === "skipped" ||
    state?.status === "not_required";

  // Hide the component entirely if nothing to do.
  if (!loading && !needsDetectionRun && allResolved && unresolvedAxes.length === 0 && !error) {
    return null;
  }

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/20">
      <div className="flex items-center justify-between border-b border-amber-200 px-4 py-2 dark:border-amber-900">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-900 dark:text-amber-100">
            Scope check
          </h3>
          <span className="text-[10px] text-amber-900/70 dark:text-amber-100/70">
            D-049 · scope authority comes from the brief, not the corpus
          </span>
        </div>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="text-[10px] uppercase tracking-wider text-amber-900/70 hover:text-amber-900 dark:text-amber-100/70 dark:hover:text-amber-100"
        >
          {collapsed ? "show" : "hide"}
        </button>
      </div>

      {!collapsed && (
        <div className="space-y-3 px-4 py-3 text-xs text-amber-950 dark:text-amber-50">
          {error && (
            <p className="text-red-700 dark:text-red-300">{error}</p>
          )}

          {needsDetectionRun && (
            <div className="space-y-2">
              <p className="leading-relaxed">
                Before I generate hypotheses, I'll check which scope axes the
                brief specifies and which it leaves open. Only the open ones
                where your project corpus has a dominant skew will trigger a
                clarifier.
              </p>
              <button
                onClick={runDetection}
                disabled={loading}
                className="rounded-md bg-amber-900 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-amber-50 disabled:opacity-40 dark:bg-amber-100 dark:text-amber-900"
              >
                {loading ? "Checking…" : "Check brief scope"}
              </button>
            </div>
          )}

          {unresolvedAxes.length > 0 &&
            unresolvedAxes.map((axis) => {
              const dominant = state?.skew[axis]?.dominant ?? null;
              const share = state?.skew[axis]?.share ?? 0;
              const chips = chipsForAxis(axis, dominant);
              const draft = customDraft[axis] ?? "";
              return (
                <div
                  key={axis}
                  className="space-y-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-950/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider">
                      {AXIS_LABELS[axis]}
                    </span>
                    {dominant && (
                      <span className="text-[10px] text-amber-900/70 dark:text-amber-100/70">
                        Your project corpus skews {Math.round(share * 100)}% toward "{dominant}"
                      </span>
                    )}
                  </div>
                  <p className="leading-relaxed">{AXIS_QUESTIONS[axis]}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {chips.map((chip) => (
                      <button
                        key={chip.value}
                        onClick={() => answer(axis, chip.value)}
                        disabled={savingAxis === axis}
                        className="rounded-full border border-amber-400 bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900 disabled:opacity-40 dark:border-amber-700 dark:bg-amber-900/50 dark:text-amber-50"
                      >
                        {chip.label}
                      </button>
                    ))}
                    <button
                      onClick={() => answer(axis, "skipped")}
                      disabled={savingAxis === axis}
                      className="rounded-full border border-amber-300 px-2 py-0.5 text-[10px] font-medium text-amber-900/70 disabled:opacity-40 dark:border-amber-800 dark:text-amber-100/70"
                    >
                      Skip — keep open
                    </button>
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      value={draft}
                      onChange={(e) =>
                        setCustomDraft((d) => ({ ...d, [axis]: e.target.value }))
                      }
                      placeholder="Or specify your own…"
                      className="flex-1 rounded border border-amber-300 bg-[var(--color-background)] px-2 py-1 text-[11px] dark:border-amber-800"
                    />
                    <button
                      onClick={() => draft.trim() && answer(axis, draft.trim())}
                      disabled={savingAxis === axis || draft.trim().length === 0}
                      className="rounded border border-amber-400 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-amber-900 disabled:opacity-40 dark:border-amber-700 dark:text-amber-50"
                    >
                      {savingAxis === axis ? "…" : "Save"}
                    </button>
                  </div>
                </div>
              );
            })}

          {state &&
            unresolvedAxes.length === 0 &&
            (state.status === "answered" || state.status === "skipped") && (
              <p className="text-amber-900/70 dark:text-amber-100/70">
                Scope resolved. Hypothesis generation will inherit scope from
                the brief and your clarifications.
              </p>
            )}
          {state?.status === "not_required" && (
            <p className="text-amber-900/70 dark:text-amber-100/70">
              Brief specifies enough scope that no clarification is needed.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
