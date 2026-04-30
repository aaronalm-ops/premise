// Reranker — second pass that prunes top-k retrieved chunks down to top-n
// truly relevant ones. We use Haiku (junior analyst, cheap) for this judgment.
//
// Why rerank: pure embedding similarity is good but noisy. A chunk that's
// semantically close to a question may not actually answer it. The reranker
// reads chunks like a human would and keeps only the ones that actually help.

import { getAnthropic, MODELS } from "@/lib/llm/anthropic";
import type { RetrievedChunk } from "@/lib/rag/types";

const RERANKER_SYSTEM = `You are a research assistant evaluating which retrieved text chunks are actually relevant to answering a researcher's question.

You will be given a question and a numbered list of candidate chunks. Your job is to identify which chunks contain information that directly helps answer the question.

Output the relevant chunk numbers ONLY, comma-separated, in order of relevance.

If NONE of the chunks are relevant, output exactly: NONE

Examples:
- "3, 1, 7"
- "2"
- "NONE"

Do not output anything else. No explanation. No preamble. Just the numbers or NONE.`;

export async function rerank(
  question: string,
  chunks: RetrievedChunk[],
  keepTop: number = 5,
): Promise<RetrievedChunk[]> {
  if (chunks.length === 0) return [];
  if (chunks.length <= keepTop) return chunks;

  const numbered = chunks
    .map((c, i) => `[${i + 1}]\n${c.content}`)
    .join("\n\n---\n\n");

  const anthropic = getAnthropic();
  const response = await anthropic.messages.create({
    model: MODELS.haiku,
    max_tokens: 100,
    system: RERANKER_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Question: ${question}\n\nCandidate chunks:\n\n${numbered}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return chunks.slice(0, keepTop);
  }

  const raw = textBlock.text.trim();
  if (raw.toUpperCase() === "NONE") return [];

  const indices = raw
    .split(",")
    .map((s) => parseInt(s.trim(), 10) - 1)
    .filter((i) => Number.isInteger(i) && i >= 0 && i < chunks.length);

  const seen = new Set<number>();
  const ordered: RetrievedChunk[] = [];
  for (const i of indices) {
    if (!seen.has(i)) {
      seen.add(i);
      ordered.push(chunks[i]);
      if (ordered.length >= keepTop) break;
    }
  }

  return ordered;
}
