"use client";

import { useState } from "react";
import { ProjectSwitcher } from "./project-switcher";
import { ChatPane } from "./chat-pane";
import { ArtefactsPane } from "./artefacts-pane";

export function CanvasShell() {
  const [projectId, setProjectId] = useState<string | null>(null);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b border-[var(--color-border)] px-6">
        <div className="flex items-center gap-3">
          <div className="size-7 rounded-md bg-[var(--color-foreground)]" />
          <h1 className="text-sm font-semibold tracking-tight">Premise</h1>
          <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
            Phase 1.5
          </span>
        </div>
        <ProjectSwitcher selectedId={projectId} onSelect={setProjectId} />
      </header>

      <main className="grid flex-1 grid-cols-[minmax(0,2fr)_minmax(0,3fr)] overflow-hidden">
        <ChatPane projectId={projectId} />
        <ArtefactsPane />
      </main>
    </div>
  );
}
