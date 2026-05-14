// One-line label appearing under any RAG-grounded artefact. Names the
// scope and limits of the grounding so a reader can't mistake "cited from
// your corpus" for "represents the full space of evidence."
//
// The disclosure exists because the corpus is the researcher's own prior
// work — which is both the moat and the blind-spot reproducer. See
// docs/TASKFORCE_CRITIQUE.md critique 9c.

type Context = "answer" | "hypotheses" | "analysis" | "recommendations" | "angles";

const COPY: Record<Context, string> = {
  answer:
    "Grounded in this project's corpus. The corpus is what you've put in front of Premise — it may not represent the full space of evidence.",
  hypotheses:
    "Hypotheses are grounded in this project's corpus and any public-library sources you've enabled. The grounding can reproduce gaps in either.",
  analysis:
    "Verdicts test the accepted hypotheses against the data you've uploaded. Emergent patterns are exploratory — treat as hypothesis-generating, not hypothesis-confirming.",
  recommendations:
    "Each recommendation's confidence is calibrated against the evidence chain shown — verdicts and emergent patterns. The caveats are the bot's, not yours; layer your own before acting.",
  angles:
    "Angles draw on the accepted hypotheses, the analysis verdicts, the accepted recommendation (if any), and the corpus that produced them. What the corpus doesn't cover, the angles won't cover either.",
};

export function GroundingDisclosure({ context }: { context: Context }) {
  return (
    <p className="mt-2 text-[10px] italic leading-relaxed text-[var(--color-muted-foreground)]">
      {COPY[context]}
    </p>
  );
}
