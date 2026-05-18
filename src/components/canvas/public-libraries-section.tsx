"use client";

import { useEffect, useState } from "react";

type PublicLibrary = {
  id: string;
  name: string;
  description: string | null;
  document_count: number;
};

type Props = {
  projectId: string;
  includePublicLibraries: boolean;
  onChange: () => void;
};

// D-047: the public library is read-only and admin-managed (no edits from
// the UI). This component used to inline-expand every public doc — that was
// confusing because users couldn't tell what was in *their* corpus vs the
// shared library, and DELETE buttons appeared on shared docs. Now it's a
// single one-line opt-in toggle per project: turn the public library on or
// off as a retrieval source for *this* project. To actually browse the
// library, open the public-library project in the project switcher (it
// loads read-only).
export function PublicLibrariesSection({
  projectId,
  includePublicLibraries,
  onChange,
}: Props) {
  const [libraries, setLibraries] = useState<PublicLibrary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/public-libraries")
      .then((r) => r.json())
      .then((data) => {
        setLibraries(
          (data.libraries ?? []).map(
            (l: { id: string; name: string; description: string | null; document_count: number }) => ({
              id: l.id,
              name: l.name,
              description: l.description,
              document_count: l.document_count,
            }),
          ),
        );
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded || libraries.length === 0) return null;

  const totalDocs = libraries.reduce((s, l) => s + l.document_count, 0);

  const toggle = async () => {
    setSaving(true);
    setError(null);
    try {
      const r = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          include_public_libraries: !includePublicLibraries,
        }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.error ?? `Update failed (${r.status})`);
      }
      onChange();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`rounded-md border px-3 py-2 text-xs ${
        includePublicLibraries
          ? "border-sky-300 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/30"
          : "border-[var(--color-border)] bg-[var(--color-muted)]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider ${
              includePublicLibraries
                ? "text-sky-700 dark:text-sky-300"
                : "text-[var(--color-muted-foreground)]"
            }`}
          >
            Public library
          </span>
          <span
            className={
              includePublicLibraries
                ? "text-sky-900 dark:text-sky-100"
                : "text-[var(--color-foreground)]"
            }
          >
            {totalDocs} doc{totalDocs === 1 ? "" : "s"} —{" "}
            {includePublicLibraries
              ? "included in this project's retrievals"
              : "not included in this project"}
          </span>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={saving}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-[10px] font-medium uppercase tracking-wider disabled:opacity-40"
        >
          {saving
            ? "Saving…"
            : includePublicLibraries
              ? "Remove"
              : "Include"}
        </button>
      </div>
      {error && (
        <p className="mt-1 text-[10px] text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
