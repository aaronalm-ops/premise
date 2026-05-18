// Shared Sonnet-as-judge primitive (D-046).
//
// Each quality-judge probe (hypothesis / persona / recommendation /
// story-angle) shares the same shape: render a structured payload, ask
// Sonnet to score 1-5 across named dimensions, return a verdict per item
// plus a set-level summary. The runners that use this helper just supply
// the dimensions, the rubric, and the rendered payload.
//
// Distinct from D-042's claim-judge: that one returns booleans per claim;
// this one returns 1-5 integers per dimension. Both use forced tool_use to
// keep the output parseable.

import { MODELS, getAnthropic } from "@/lib/llm/anthropic";
import { withRetry } from "@/lib/api/retry";

export type JudgeDimension = {
  name: string;
  description: string;
};

export type JudgeRequest = {
  dimensions: JudgeDimension[];
  systemRubric: string;
  payload: string;
};

export type JudgeScores = Record<string, number>;

export type JudgeResult = {
  scores: JudgeScores;
  notes: string;
};

export async function judgeWithSonnet(
  req: JudgeRequest,
): Promise<JudgeResult> {
  const dimNames = req.dimensions.map((d) => d.name);

  const tool = {
    name: "score_dimensions",
    description:
      "Returns an integer 1-5 score for each named dimension plus one short notes string explaining the weakest score.",
    input_schema: {
      type: "object" as const,
      properties: {
        scores: {
          type: "object",
          properties: Object.fromEntries(
            dimNames.map((n) => [
              n,
              {
                type: "integer",
                minimum: 1,
                maximum: 5,
              },
            ]),
          ),
          required: dimNames,
        },
        notes: {
          type: "string",
          description:
            "One short sentence (≤25 words) naming the weakest score and why.",
        },
      },
      required: ["scores", "notes"],
    },
  };

  const dimensionDocs = req.dimensions
    .map((d, i) => `${i + 1}. ${d.name} — ${d.description}`)
    .join("\n");

  const client = getAnthropic();
  const response = await withRetry(() =>
    client.messages.create({
      model: MODELS.sonnet,
      max_tokens: 400,
      system: `${req.systemRubric}\n\nDimensions to score (each 1-5):\n${dimensionDocs}\n\nReturn integer scores via the score_dimensions tool. Score honestly — a generic, vague, or contradictory output should score low. A specific, falsifiable, evidence-grounded output should score high.`,
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      messages: [{ role: "user", content: req.payload }],
    }),
  );

  const block = response.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    return {
      scores: Object.fromEntries(dimNames.map((n) => [n, 0])),
      notes: "judge returned no tool_use block",
    };
  }
  const data = block.input as { scores?: JudgeScores; notes?: string };
  const scores: JudgeScores = {};
  for (const n of dimNames) {
    const v = data.scores?.[n];
    scores[n] = typeof v === "number" ? v : 0;
  }
  return { scores, notes: data.notes ?? "" };
}

export function scoresAverage(scores: JudgeScores): number {
  const values = Object.values(scores);
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function checkScores(
  scores: JudgeScores,
  min_score: number,
  min_average_score?: number,
): string[] {
  const reasons: string[] = [];
  for (const [name, value] of Object.entries(scores)) {
    if (value < min_score) {
      reasons.push(`${name} scored ${value} < threshold ${min_score}`);
    }
  }
  if (typeof min_average_score === "number") {
    const avg = scoresAverage(scores);
    if (avg < min_average_score) {
      reasons.push(
        `average score ${avg.toFixed(2)} < threshold ${min_average_score}`,
      );
    }
  }
  return reasons;
}
