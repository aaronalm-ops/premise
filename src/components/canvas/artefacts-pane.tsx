"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  Brief,
  Hypothesis,
  Persona,
  QuestionWithVariants,
} from "@/lib/rag/types";
import { BriefArtefact } from "./brief-artefact";
import { DocumentsArtefact } from "./documents-artefact";
import { HypothesesArtefact } from "./hypotheses-artefact";
import { PersonasArtefact } from "./personas-artefact";
import { QuestionsArtefact } from "./questions-artefact";
import { AnalysisArtefact } from "./analysis-artefact";
import { RecommendationsArtefact } from "./recommendations-artefact";
import { StoriesArtefact } from "./stories-artefact";
import { ScopeClarifier } from "./scope-clarifier";

type Props = { projectId: string | null };

export function ArtefactsPane({ projectId }: Props) {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [questions, setQuestions] = useState<QuestionWithVariants[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!projectId) {
      setBrief(null);
      setHypotheses([]);
      setPersonas([]);
      setQuestions([]);
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(`/api/briefs?projectId=${projectId}`);
      const data = (await r.json()) as { briefs?: Brief[] };
      const latest = data.briefs?.[0] ?? null;
      setBrief(latest);

      if (latest) {
        const [briefRes, personasRes, questionsRes] = await Promise.all([
          fetch(`/api/briefs/${latest.id}`),
          fetch(`/api/briefs/${latest.id}/personas`),
          fetch(`/api/briefs/${latest.id}/questions`),
        ]);
        const briefData = (await briefRes.json()) as {
          hypotheses?: Hypothesis[];
        };
        const personasData = (await personasRes.json()) as {
          personas?: Persona[];
        };
        const questionsData = (await questionsRes.json()) as {
          questions?: QuestionWithVariants[];
        };
        setHypotheses(briefData.hypotheses ?? []);
        setPersonas(personasData.personas ?? []);
        setQuestions(questionsData.questions ?? []);
      } else {
        setHypotheses([]);
        setPersonas([]);
        setQuestions([]);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasAcceptedHypotheses = hypotheses.some((h) => h.status === "accepted");

  return (
    <section className="flex h-full flex-col">
      <div className="border-b border-[var(--color-border)] px-6 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
          Artefacts
        </h2>
      </div>

      <div className="premise-scroll min-h-0 flex-1 space-y-6 overflow-y-scroll px-6 py-6">
        {!projectId && (
          <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-6 text-center text-sm text-[var(--color-muted-foreground)]">
            Pick a project from the top right to start.
          </div>
        )}

        {projectId && (
          <>
            <DocumentsArtefact projectId={projectId} />
            <BriefArtefact
              projectId={projectId}
              brief={brief}
              loading={loading}
              onChange={refresh}
            />
            <ScopeClarifier brief={brief} onResolved={refresh} />
            <HypothesesArtefact
              brief={brief}
              hypotheses={hypotheses}
              onChange={refresh}
            />
            <PersonasArtefact
              brief={brief}
              personas={personas}
              hasAcceptedHypotheses={hasAcceptedHypotheses}
              onChange={refresh}
            />
            <QuestionsArtefact
              brief={brief}
              hypotheses={hypotheses}
              questions={questions}
              hasAcceptedHypotheses={hasAcceptedHypotheses}
              onChange={refresh}
            />
            <AnalysisArtefact
              brief={brief}
              hypotheses={hypotheses}
              hasAcceptedHypotheses={hasAcceptedHypotheses}
            />
            <RecommendationsArtefact
              brief={brief}
              hypotheses={hypotheses}
              hasAcceptedHypotheses={hasAcceptedHypotheses}
            />
            <StoriesArtefact
              brief={brief}
              hypotheses={hypotheses}
              hasAcceptedHypotheses={hasAcceptedHypotheses}
            />
          </>
        )}
      </div>
    </section>
  );
}

function PhaseLockedArtefact({
  name,
  phase,
}: {
  name: string;
  phase: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-dashed border-[var(--color-border)] px-4 py-3 text-sm">
      <span className="font-medium text-[var(--color-muted-foreground)]">
        {name}
      </span>
      <span className="text-xs text-[var(--color-muted-foreground)]">
        {phase}
      </span>
    </div>
  );
}
