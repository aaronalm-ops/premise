"use client";

// D-054: Home screen redesign — project grid + "+ New Project" CTA, plus an
// empty-state for first-run users. Shown when no project is selected. The
// two-state pattern (empty vs populated) is from the home-page taskforce
// (Lara / Devi voices in the synthesis).
//
// For populated state: a grid of project cards. Each card shows name,
// description, corpus chip, last activity, and an Open button. The
// taskforce-recommended stage indicator + "awaiting your attention" amber
// require a status-derivation endpoint we haven't built yet; those are a
// follow-up (see TODO at the bottom of this file).

import { useEffect, useState } from "react";
import type { Project } from "@/lib/rag/types";
import { NewProjectModal } from "./new-project-modal";

type Props = {
  onOpen: (projectId: string) => void;
};

export function ProjectsHome({ onOpen }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/projects");
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "load failed");
      // Filter out public-library projects from the home grid — they appear
      // via the include-public toggle on each user project, not as standalone
      // selectables here.
      const userProjects = (data.projects as Project[]).filter(
        (p) => !p.is_public,
      );
      setProjects(userProjects);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleCreated = (project: Project) => {
    setModalOpen(false);
    onOpen(project.id);
  };

  const isEmpty = !loading && projects.length === 0;

  return (
    <section className="flex h-full flex-col overflow-hidden">
      <header className="border-b border-[var(--color-border)] px-8 py-5">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider">
              Your projects
            </h2>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              {isEmpty
                ? "Start a project to brief Premise, generate hypotheses, and run the wave through to story angles."
                : "Pick a project to resume — or start a new one."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-md bg-[var(--color-foreground)] px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-[var(--color-background)]"
          >
            + New project
          </button>
        </div>
      </header>

      <div className="premise-scroll min-h-0 flex-1 overflow-y-scroll px-8 py-6">
        {loading && (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Loading projects…
          </p>
        )}

        {error && (
          <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
        )}

        {isEmpty && <EmptyState onNew={() => setModalOpen(true)} />}

        {projects.length > 0 && (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onOpen={() => onOpen(p.id)}
              />
            ))}
          </ul>
        )}
      </div>

      <NewProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
    </section>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="mx-auto max-w-2xl rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/40 px-8 py-10 text-center">
      <p className="text-sm font-medium">
        Premise — an AI co-pilot for market and consumer insights researchers.
      </p>
      <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
        Brief → hypotheses → personas → questionnaire → analysis → recommendation → story angles. Grounded in your historical work and the public library you choose to include.
      </p>
      <button
        type="button"
        onClick={onNew}
        className="mt-5 rounded-md bg-[var(--color-foreground)] px-4 py-2 text-xs font-medium uppercase tracking-wider text-[var(--color-background)]"
      >
        + Start your first project
      </button>
    </div>
  );
}

function ProjectCard({
  project,
  onOpen,
}: {
  project: Project;
  onOpen: () => void;
}) {
  const corpusLabel = project.include_public_libraries
    ? "Project + Public"
    : "Project only";
  const created = new Date(project.created_at);
  const relative = relativeTime(created);

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 transition hover:border-[var(--color-foreground)]/30">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-tight">{project.name}</h3>
        <span className="shrink-0 rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[9px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
          {corpusLabel}
        </span>
      </div>
      {project.description && (
        <p className="line-clamp-2 text-xs text-[var(--color-muted-foreground)]">
          {project.description}
        </p>
      )}
      <div className="mt-auto flex items-center justify-between text-[10px] text-[var(--color-muted-foreground)]">
        <span>{relative}</span>
        <button
          onClick={onOpen}
          className="rounded-md border border-[var(--color-border)] px-2 py-1 text-[10px] font-medium uppercase tracking-wider hover:bg-[var(--color-muted)]"
        >
          Open →
        </button>
      </div>
    </li>
  );
}

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

// TODO (follow-up): stage indicators on each card. Needs a /api/projects/summaries
// endpoint that returns per-project { latest_brief_id, stage, awaits_attention }
// derived from the artefact bucket counts. Defer until the stage-derivation is
// worth the round-trip — for now, the card is honest about *which* projects
// exist and lets the canvas show the actual stage on open.
