// Question generation pipeline with variants.
// Unlike personas, questions are not strictly RAG-grounded — the variant
// taxonomy is methodological, not corpus-derived. We still pass the brief +
// accepted hypotheses + recommended personas as context. The schema enforces
// the "options not answers" principle: every question must have exactly 3
// variants from different methodological frames.

import { getAnthropic, MODELS } from "@/lib/llm/anthropic";
import { QUESTION_SYSTEM } from "@/lib/prompts/questions";
import {
  VARIANT_TYPES,
  type Hypothesis,
  type Persona,
  type QuestionDraft,
} from "@/lib/rag/types";

const QUESTION_TOOL = {
  name: "propose_questions",
  description:
    "Returns 4-8 ranked questionnaire items, each with exactly 3 phrasing variants from different methodological frames. The researcher selects one variant per question.",
  input_schema: {
    type: "object" as const,
    properties: {
      questions: {
        type: "array",
        minItems: 4,
        maxItems: 8,
        items: {
          type: "object",
          properties: {
            target_construct: {
              type: "string",
              description: "Short noun phrase naming what this question measures.",
            },
            rationale: {
              type: "string",
              description: "One sentence on why we ask this.",
            },
            hypothesis_id: {
              type: "string",
              description:
                "ID of the hypothesis this tests, or empty string if exploratory. Must be one of the IDs provided in the prompt.",
            },
            variants: {
              type: "array",
              minItems: 3,
              maxItems: 3,
              description:
                "Exactly 3 variants from different variant_types so the researcher sees a real methodological choice.",
              items: {
                type: "object",
                properties: {
                  variant_type: {
                    type: "string",
                    enum: VARIANT_TYPES,
                  },
                  statement: {
                    type: "string",
                    description:
                      "Full sentence, ready to paste into a survey tool.",
                  },
                  response_format: {
                    type: "string",
                    description:
                      "Short label like '5-point likert', 'open-ended', 'single-choice', 'ranked list of 5'.",
                  },
                  response_options: {
                    type: "array",
                    items: { type: "string" },
                    description:
                      "Choices for the variant; empty array for open-ended or scale-only formats.",
                  },
                  what_it_elicits: {
                    type: "string",
                    description: "One sentence on what this phrasing surfaces.",
                  },
                  caveat: {
                    type: "string",
                    description: "One sentence on the bias or weakness.",
                  },
                },
                required: [
                  "variant_type",
                  "statement",
                  "response_format",
                  "response_options",
                  "what_it_elicits",
                  "caveat",
                ],
              },
            },
          },
          required: [
            "target_construct",
            "rationale",
            "hypothesis_id",
            "variants",
          ],
        },
      },
    },
    required: ["questions"],
  },
};

export type GenerateQuestionsInput = {
  briefContent: string;
  acceptedHypotheses: Hypothesis[];
  acceptedPersonas: Persona[];
};

export type GenerateQuestionsResult = {
  drafts: QuestionDraft[];
};

export async function generateQuestions(
  input: GenerateQuestionsInput,
): Promise<GenerateQuestionsResult> {
  if (input.acceptedHypotheses.length === 0) {
    return { drafts: [] };
  }

  const hypothesesText = input.acceptedHypotheses
    .map((h) => `- id="${h.id}" :: ${h.statement}`)
    .join("\n");

  const personasText =
    input.acceptedPersonas.length > 0
      ? input.acceptedPersonas
          .map(
            (p) =>
              `- ${p.name}: ${p.description} (under-represents: ${p.under_represents ?? "n/a"})`,
          )
          .join("\n")
      : "(none accepted yet)";

  const userPrompt = `# Brief\n${input.briefContent}\n\n# Accepted hypotheses\n${hypothesesText}\n\n# Recommended personas\n${personasText}\n\nCall propose_questions now with 4-8 questions, each with 3 variants.`;

  const anthropic = getAnthropic();
  const response = await anthropic.messages.create({
    model: MODELS.sonnet,
    max_tokens: 4096,
    system: QUESTION_SYSTEM,
    tools: [QUESTION_TOOL],
    tool_choice: { type: "tool", name: QUESTION_TOOL.name },
    messages: [{ role: "user", content: userPrompt }],
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("Question generation did not produce a tool_use response");
  }

  const data = toolBlock.input as { questions: QuestionDraft[] };
  if (!Array.isArray(data.questions)) {
    throw new Error("Question generation returned wrong shape");
  }

  const validHypothesisIds = new Set(input.acceptedHypotheses.map((h) => h.id));

  const drafts = data.questions
    .map((q) => ({
      ...q,
      hypothesis_id:
        q.hypothesis_id && validHypothesisIds.has(q.hypothesis_id)
          ? q.hypothesis_id
          : null,
      variants: (q.variants ?? []).filter(
        (v) =>
          VARIANT_TYPES.includes(v.variant_type) &&
          typeof v.statement === "string" &&
          v.statement.trim().length > 0,
      ),
    }))
    .filter((q) => q.variants.length === 3);

  return { drafts };
}
