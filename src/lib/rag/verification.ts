// Per-claim verifier with prompt caching.
// System prompt is cached on the first call; subsequent calls in the same
// request hit cache (90% input cost discount).

import { MODELS } from "@/lib/llm/anthropic";
import { tracedMessagesCreate, type TraceContext } from "@/lib/telemetry/tracer";
import { VERIFIER_SYSTEM } from "@/lib/prompts/strict-rag";
import type { Claim, RetrievedChunk, StrictAnswer } from "@/lib/rag/types";

async function verifyClaim(
  claim: Claim,
  chunks: RetrievedChunk[],
  context: TraceContext,
): Promise<boolean> {
  const cited = chunks.filter((c) => claim.citation_ids.includes(c.id));
  if (cited.length === 0) return false;

  const citedText = cited
    .map((c) => `[${c.id}]\n${c.content}`)
    .join("\n\n---\n\n");

  const response = await tracedMessagesCreate(
    {
      model: MODELS.haiku,
      max_tokens: 10,
      system: [
        {
          type: "text",
          text: VERIFIER_SYSTEM,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Claim: ${claim.text}\n\nCited chunks:\n${citedText}\n\nIs the claim DIRECTLY supported by the cited chunks?`,
        },
      ],
    },
    context,
  );

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return false;
  return textBlock.text.trim().toUpperCase().startsWith("SUPPORTED");
}

export async function verifyAnswer(
  answer: StrictAnswer,
  chunks: RetrievedChunk[],
  context: TraceContext = { endpoint: "rag-verify" },
): Promise<StrictAnswer> {
  const verdicts = await Promise.all(
    answer.claims.map((claim) => verifyClaim(claim, chunks, context)),
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
