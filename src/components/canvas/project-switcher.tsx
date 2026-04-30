"use client";

import { useEffect, useState } from "react";
import type { Project } from "@/lib/rag/types";

type Props = {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

export function ProjectSwitcher({ selectedId, onSelect }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Failed to load projects");
        setProjects(data.projects ?? []);
        setStatus("ready");
      })
      .catch((err: Error) => {
        setErrMsg(err.message);
        setStatus("error");
      });
  }, []);

  const placeholder =
    status === "loading"
      ? "Loading projects…"
      : status === "error"
        ? `Error: ${errMsg}`
        : projects.length === 0
          ? "No projects yet — create one via CLI"
          : "Select a project";

  return (
    <select
      value={selectedId ?? ""}
      onChange={(e) => onSelect(e.target.value || null)}
      disabled={status !== "ready" || projects.length === 0}
      className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-xs font-medium text-[var(--color-foreground)] disabled:opacity-50"
    >
      <option value="">{placeholder}</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
