"use client";

import { useState } from "react";
import { ProjectSwitcher } from "./project-switcher";
import { ChatPane } from "./chat-pane";
import { ArtefactsPane } from "./artefacts-pane";
import { ProjectsHome } from "./projects-home";
import { CostBadge } from "./cost-badge";
import { PremiseMark } from "./premise-mark";
import { AccountMenu } from "./account-menu";

type Props = {
  userEmail: string | null;
};

export function CanvasShell({ userEmail }: Props) {
  const [projectId, setProjectId] = useState<string | null>(null);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b border-[var(--color-border)] px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setProjectId(null)}
            className="flex items-center gap-3 rounded-md transition hover:opacity-80"
            title="Back to your projects"
          >
            <div className="flex size-7 items-center justify-center rounded-md bg-[var(--color-foreground)]">
              <PremiseMark className="size-4 text-[var(--color-background)]" />
            </div>
            <h1 className="text-sm font-semibold tracking-tight">Premise</h1>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/cost-calculator"
            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            title="Cost-at-scale calculator — what one study costs to run"
          >
            Costs
          </a>
          <CostBadge projectId={projectId} />
          {projectId && (
            <ProjectSwitcher selectedId={projectId} onSelect={setProjectId} />
          )}
          <AccountMenu email={userEmail} />
        </div>
      </header>

      {projectId ? (
        <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,2fr)_minmax(0,3fr)] grid-rows-[minmax(0,1fr)] overflow-hidden">
          <ChatPane projectId={projectId} />
          <ArtefactsPane projectId={projectId} />
        </main>
      ) : (
        <main className="min-h-0 flex-1 overflow-hidden">
          <ProjectsHome onOpen={setProjectId} />
        </main>
      )}
    </div>
  );
}
