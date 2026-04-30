// Per-claim verifier. The third layer of the strict-abstention pipeline:
//   1. Schema (generation.ts) — model must produce claim+citation tuples
//   2. Verifier (here) — reads each claim and confirms the cited chunks
//      actually say what the claim says
//   3. UI gate (rendering layer) — refuses to display uncited claims
//
// This catches the long tail of cases where the model produced a citation
// that's topically related but doesn't actually support the claim.

import { getAnthropic, MODELS } from "@/lib/llm/anthropic";
import { VERIFIER_SYSTEM } from "@/lib/prompts/strict-rag";
import type { Claim, RetrievedChunk, StrictAnswer } from "@/lib/rag/types";

async function verifyClaim(
  claim: Claim,
  chunks: RetrievedChunk[],
): Promise<boolean> {
  const cited = chunks.filter((c) => claim.citation_ids.includes(c.id));
  if (cited.length === 0) return false;

  const citedText = cited
    .map((c) => `[${c.id}]\n${c.content}`)
    .join("\n\n---\n\n");

  const anthropic = getAnthropic();
  const response = await anthropic.messages.create({
    model: MODELS.haiku,
    max_tokens: 10,
    system: VERIFIER_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Claim: ${claim.text}\n\nCited chunks:\n${citedText}\n\nIs the claim DIRECTLY supported by the cited chunks?`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return false;
  return textBlock.text.trim().toUpperCase().startsWith("SUPPORTED");
}

export async function verifyAnswer(
  answer: StrictAnswer,
  chunks: RetrievedChunk[],
): Promise<StrictAnswer> {
  const verdicts = await Promise.all(
    answer.claims.map((claim) => verifyClaim(claim, chunks)),
  );
  const surviving = answer.claims.filter((_, i) => verdicts[i]);

  const dropped = answer.claims.length - surviving.length;
  const unanswered =
    dropped > 0
      ? [
          ...answer.unanswered_aspects,
          `${dropped} draft claim(s) were dropped because the cited chunks did not directly support them.`,
        ]
      : answer.unanswered_aspects;

  return { claims: surviving, unanswered_aspects: unanswered };
}
