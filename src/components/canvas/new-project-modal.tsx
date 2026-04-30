"use client";

import { useEffect, useState } from "react";
import type { Confidentiality, Project } from "@/lib/rag/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (project: Project) => void;
};

const CONFIDENTIALITY_OPTIONS: Array<{
  value: Confidentiality;
  label: string;
  hint: string;
}> = [
  {
    value: "client-confidential",
    label: "Client-confidential",
    hint: "Default. NDA-typical client work.",
  },
  {
    value: "nda-restricted",
    label: "NDA-restricted",
    hint: "Strictest tier. For projects with explicit data-handling clauses.",
  },
  {
    value: "public",
    label: "Public",
    hint: "Internal benchmarks, syndicated reports, no confidentiality.",
  },
];

export function NewProjectModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [confidentiality, setConfidentiality] =
    useState<Confidentiality>("client-confidential");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setConfidentiality("client-confidential");
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const r = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          confidentiality,
        }),
      });
      const data = await r.json();
      if (!r.ok)
        throw new Error(data.error ?? `Create failed (${r.status})`);
      onCreated(data.project as Project);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            New project
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[var(--color-muted-foreground)] hover:underline"
          >
            close
          </button>
        </div>

        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
            Name
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sustainability tracker 2026"
            autoFocus
            className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-foreground)]/10"
          />
        </label>

        <label className="mt-3 block">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
            Description (optional)
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="One-line summary of what this project is for."
            className="mt-1 w-full resize-y rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--color-foreground)]/10"
          />
        </label>

        <fieldset className="mt-3">
          <legend className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
            Confidentiality
          </legend>
          <div className="mt-1 space-y-1">
            {CONFIDENTIALITY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-start gap-2 rounded-md border border-[var(--color-border)] px-3 py-2 text-xs hover:bg-[var(--color-muted)]"
              >
                <input
                  type="radio"
                  name="confidentiality"
                  value={opt.value}
                  checked={confidentiality === opt.value}
                  onChange={() => setConfidentiality(opt.value)}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-medium">{opt.label}</div>
                  <div className="text-[10px] text-[var(--color-muted-foreground)]">
                    {opt.hint}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        {error && (
          <p className="mt-3 text-xs text-red-700 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={creating || !name.trim()}
            className="rounded-md bg-[var(--color-foreground)] px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {creating ? "Creating…" : "Create project"}
          </button>
        </div>
      </div>
    </div>
  );
}
