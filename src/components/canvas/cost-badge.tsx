"use client";

import { useEffect, useState } from "react";

type Props = {
  projectId: string | null;
  refreshKey?: number;
};

type CostRollup = {
  total_usd: number;
  call_count: number;
  cache_hit_rate: number;
  by_endpoint: Array<{
    endpoint: string;
    service: string;
    call_count: number;
    cost_usd: number;
  }>;
};

export function CostBadge({ projectId, refreshKey }: Props) {
  const [rollup, setRollup] = useState<CostRollup | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setRollup(null);
      return;
    }
    let cancelled = false;
    const fetchCost = () =>
      fetch(`/api/projects/${projectId}/costs`)
        .then((r) => r.json())
        .then((d: CostRollup) => {
          if (!cancelled) setRollup(d);
        })
        .catch(() => {});
    fetchCost();
    const interval = setInterval(fetchCost, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [projectId, refreshKey]);

  if (!projectId || !rollup) return null;

  const dollars = rollup.total_usd;
  const display = dollars < 0.01 ? "<$0.01" : `$${dollars.toFixed(2)}`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-[var(--color-border)] px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
        title="Project API spend"
      >
        Spend {display}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-72 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-xs shadow-lg">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Project spend
            </span>
            <span className="font-mono">{display}</span>
          </div>
          <div className="mt-1 text-[10px] text-[var(--color-muted-foreground)]">
            {rollup.call_count} call{rollup.call_count === 1 ? "" : "s"}
            {rollup.cache_hit_rate > 0 &&
              ` · ${(rollup.cache_hit_rate * 100).toFixed(0)}% cache hit`}
          </div>
          {rollup.by_endpoint.length > 0 && (
            <div className="mt-2 space-y-1 border-t border-[var(--color-border)] pt-2">
              {rollup.by_endpoint.slice(0, 8).map((row) => (
                <div
                  key={`${row.service}|${row.endpoint}`}
                  className="flex justify-between gap-2 font-mono text-[10px]"
                >
                  <span className="truncate text-[var(--color-muted-foreground)]">
                    {row.endpoint}{" "}
                    <span className="opacity-60">×{row.call_count}</span>
                  </span>
                  <span>${row.cost_usd.toFixed(4)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
