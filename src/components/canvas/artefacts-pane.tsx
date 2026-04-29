const ARTEFACT_TYPES = [
  { name: "Brief", phase: "Phase 1" },
  { name: "Hypotheses", phase: "Phase 2" },
  { name: "Personas", phase: "Phase 3" },
  { name: "Questionnaire", phase: "Phase 3" },
  { name: "Analysis", phase: "Phase 4" },
  { name: "Story angles", phase: "Phase 5" },
];

export function ArtefactsPane() {
  return (
    <section className="flex h-full flex-col">
      <div className="border-b border-[var(--color-border)] px-6 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
          Artefacts
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <ul className="space-y-2">
          {ARTEFACT_TYPES.map((a) => (
            <li
              key={a.name}
              className="flex items-center justify-between rounded-lg border border-dashed border-[var(--color-border)] px-4 py-3 text-sm"
            >
              <span className="font-medium">{a.name}</span>
              <span className="text-xs text-[var(--color-muted-foreground)]">
                {a.phase}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
          Each artefact appears here as the conversation progresses. They are
          editable, ranked, and citation-aware. Every option the bot generates
          shows up as an option for you to accept, edit, or reject.
        </p>
      </div>
    </section>
  );
}
