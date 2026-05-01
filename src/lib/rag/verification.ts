// Per-claim verifier — batched into a single Haiku call (L-5).
// Old behaviour: N verifier calls per ask (one per claim). New behaviour: one
// call that returns a boolean array. ~5x cost reduction on the verify step
// and one fewer round-trip.

import { MODELS } from "@/lib/llm/anthropic";
import { tracedMessagesCreate, type TraceContext } from "@/lib/telemetry/tracer";
import type { Claim, RetrievedChunk, StrictAnswer } from "@/lib/rag/types";

const BATCH_VERIFIER_SYSTEM = `You are a strict fact-checker. You will be given multiple claims and the source chunks they cite. For EACH claim, decide whether it is DIRECTLY supported by what its cited chunks actually say.

A claim is supported only if a careful reader, looking at the cited chunks, would say "yes, this is what they say."

A claim is NOT supported if:
- The chunks merely mention the same topic without making the claim
- The chunks imply something close but not identical
- The claim adds detail the chunks don't contain
- The claim generalises beyond what the chunks state

Call verify_claims with a parallel array of booleans — true if supported, false if not. The array length must match the number of claims, in the same order.`;

const VERIFIER_TOOL = {
  name: "verify_claims",
  description:
    "Returns a boolean per input claim — true if the cited chunks directly support the claim, false otherwise.",
  input_schema: {
    type: "object" as const,
    properties: {
      verdicts: {
        type: "array",
        description:
          "One boolean per claim, in the same order as the input. true = supported, false = not supported.",
        items: { type: "boolean" },
      },
    },
    required: ["verdicts"],
  },
  cache_control: { type: "ephemeral" as const },
};

export async function verifyAnswer(
  answer: StrictAnswer,
  chunks: RetrievedChunk[],
  context: TraceContext = { endpoint: "rag-verify" },
): Promise<StrictAnswer> {
  if (answer.claims.length === 0) return answer;

  const verdicts = await batchVerifyClaims(answer.claims, chunks, context);

  const surviving = answer.claims.filter((_, i) => verdicts[i] === true);
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

async function batchVerifyClaims(
  claims: Claim[],
  chunks: RetrievedChunk[],
  context: TraceContext,
): Promise<boolean[]> {
  const chunkById = new Map(chunks.map((c) => [c.id, c]));

  const claimBlocks = claims
    .map((c, i) => {
      const cited = c.citation_ids
        .map((id) => chunkById.get(id))
        .filter((x): x is RetrievedChunk => Boolean(x));
      const citedText =
        cited.length > 0
          ? cited.map((ch) => `[${ch.id}]\n${ch.content}`).join("\n\n")
          : "(no cited chunks found in retrieval)";
      return `# Claim ${i + 1}\n${c.text}\n\n## Cited chunks\n${citedText}`;
    })
    .join("\n\n---\n\n");

  const response = await tracedMessagesCreate(
    {
      model: MODELS.haiku,
      max_tokens: 200,
      system: [{ type: "text", text: BATCH_VERIFIER_SYSTEM }],
      tools: [VERIFIER_TOOL],
      tool_choice: { type: "tool", name: VERIFIER_TOOL.name },
      messages: [
        {
          role: "user",
          content: `Verify these ${claims.length} claim(s). Return exactly ${claims.length} boolean(s) in order.\n\n${claimBlocks}`,
        },
      ],
    },
    context,
  );

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    // Fallback: drop everything to be safe.
    return claims.map(() => false);
  }
  const data = toolBlock.input as { verdicts?: boolean[] };
  const v = data.verdicts ?? [];
  while (v.length < claims.length) v.push(false);
  return v.slice(0, claims.length);
}
