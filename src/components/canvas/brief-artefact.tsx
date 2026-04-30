"use client";

import { useEffect, useState } from "react";
import type { Brief } from "@/lib/rag/types";

type Props = {
  projectId: string;
  brief: Brief | null;
  loading: boolean;
  onChange: () => void;
};

export function BriefArtefact({ projectId, brief, loading, onChange }: Props) {
  const [draft, setDraft] = useState(brief?.content ?? "");
  const [title, setTitle] = useState(brief?.title ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(brief?.content ?? "");
    setTitle(brief?.title ?? "");
  }, [brief?.id, brief?.content, brief?.title]);

  const dirty =
    (brief && (draft !== (brief.content ?? "") || title !== (brief.title ?? ""))) ||
    (!brief && draft.trim().length > 0);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (brief) {
        const r = await fetch(`/api/briefs/${brief.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title || null,
            content: draft,
          }),
        });
        if (!r.ok) {
          const data = await r.json();
          throw new Error(data.error ?? "save failed");
        }
      } else {
        const r = await fetch("/api/briefs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            title: title || null,
            content: draft,
          }),
        });
        if (!r.ok) {
          const data = await r.json();
          throw new Error(data.error ?? "create failed");
        }
      }
      onChange();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider">
            Brief
          </h3>
          <span className="text-[10px] text-[var(--color-muted-foreground)]">
            {brief ? "saved" : "not saved"}
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
          Phase 2
        </span>
      </div>

      <div className="space-y-3 px-4 py-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Optional title (e.g. 'Sustainability tracker 2026')"
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-foreground)]/10"
        />
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Paste your research brief here. The objective, the audience, the constraints, what you want to learn."
          rows={4}
          disabled={loading}
          className="w-full resize-y rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--color-foreground)]/10"
        />
        {error && (
          <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[var(--color-muted-foreground)]">
            {brief
              ? `Last saved ${new Date(brief.updated_at).toLocaleString()}`
              : "Once saved, you can generate hypotheses below."}
          </span>
          <button
            onClick={save}
            disabled={!dirty || saving || draft.trim().length === 0}
            className="rounded-md bg-[var(--color-foreground)] px-3 py-1 text-xs font-medium text-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "Saving…" : brief ? "Save changes" : "Create brief"}
          </button>
        </div>
      </div>
    </div>
  );
}
