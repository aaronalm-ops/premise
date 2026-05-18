"use client";

// D-054: New-project modal redesigned per the home-page taskforce.
//
// Three fields: name + brief + reference materials (3 options). Confidentiality
// stays on a hidden default ("client-confidential") — the activation cost of
// asking on every project is higher than the segmentation value at this stage.
// Brief is optional at creation; researchers who paste a brief get it saved
// immediately, those who don't write one later in the artefacts pane.
//
// Reference materials options:
//   * public-only — Public library only (cold-start case)
//   * own-only — Upload your own documents
//   * own-plus-public — Project + public library

import { useEffect, useState } from "react";
import type { Project } from "@/lib/rag/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (project: Project) => void;
};

type CorpusOption = "own-only" | "own-plus-public" | "public-only";

const CORPUS_OPTIONS: Array<{
  value: CorpusOption;
  label: string;
  hint: string;
}> = [
  {
    value: "own-only",
    label: "Upload your own documents",
    hint: "Your project's documents are the only grounding source. Best for confidential client work.",
  },
  {
    value: "own-plus-public",
    label: "Upload your own + public library",
    hint: "Your documents plus the shared public corpus. Best when you want context from both.",
  },
  {
    value: "public-only",
    label: "Public library only",
    hint: "Start with just the public corpus — no upload required. Useful for exploration or first-runs.",
  },
];

export function NewProjectModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [brief, setBrief] = useState("");
  const [corpus, setCorpus] = useState<CorpusOption>("own-only");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setBrief("");
      setCorpus("own-only");
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
      // Step 1: create the project.
      const r = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: null,
          confidentiality: "client-confidential",
        }),
      });
      const data = await r.json();
      if (!r.ok)
        throw new Error(data.error ?? `Create failed (${r.status})`);
      const project = data.project as Project;

      // Step 2: apply the corpus choice. Default is `include_public_libraries=false`
      // for new projects (D-047). We only PATCH when the user picked the
      // public-inclusive option or the public-only option.
      const includePublic = corpus !== "own-only";
      if (includePublic) {
        await fetch(`/api/projects/${project.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ include_public_libraries: true }),
        });
      }

      // Step 3: if a brief was pasted, persist it now so the project lands
      // on the canvas with a saved brief ready for scope-check.
      if (brief.trim().length > 0) {
        await fetch("/api/briefs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: project.id,
            title: null,
            content: brief.trim(),
          }),
        });
      }

      onCreated(project);
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
        className="w-full max-w-lg rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-5 shadow-xl"
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
            Project name
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
            Brief
            <span className="ml-1 normal-case text-[10px] font-normal text-[var(--color-muted-foreground)]/70">
              — paste now or save later
            </span>
          </span>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={4}
            placeholder="What decision will this research inform? What outcome would make this useful?"
            className="mt-1 w-full resize-y rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--color-foreground)]/10"
          />
        </label>

        <fieldset className="mt-3">
          <legend className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
            Reference materials
          </legend>
          <div className="mt-1 space-y-1">
            {CORPUS_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-start gap-2 rounded-md border border-[var(--color-border)] px-3 py-2 text-xs hover:bg-[var(--color-muted)]"
              >
                <input
                  type="radio"
                  name="corpus"
                  value={opt.value}
                  checked={corpus === opt.value}
                  onChange={() => setCorpus(opt.value)}
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
            {creating ? "Creating…" : "Create project →"}
          </button>
        </div>
      </div>
    </div>
  );
}
