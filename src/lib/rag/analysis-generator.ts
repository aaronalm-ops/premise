// Analysis generation pipeline.
// Reuses the strict-output chassis (D-010 / D-018) — Sonnet with forced
// tool_use. The schema enforces verdict completeness and citation discipline.
// Closes P-4 (selected_variant_id finally has a downstream consumer).

import { MODELS } from "@/lib/llm/anthropic";
import { tracedMessagesCreate } from "@/lib/telemetry/tracer";
import { ANALYSIS_SYSTEM } from "@/lib/prompts/analysis";
import { rectifyVerdicts } from "@/lib/rag/consistency-checks";
import type {
  AnalysisData,
  AnalysisGenerationResult,
  DataProvenance,
  EmergentPattern,
  Hypothesis,
  HypothesisVerdict,
  Persona,
  QuestionWithVariants,
} from "@/lib/rag/types";

const DATA_PROVENANCE_VALUES: DataProvenance[] = [
  "data-grounded",
  "data-extrapolated",
  "general-knowledge",
];

const ANALYSIS_TOOL = {
  name: "analyse_data",
  description:
    "Returns a hypothesis-by-hypothesis verdict, emergent patterns, and study-wide caveats based on the uploaded data sources.",
  input_schema: {
    type: "object" as const,
    properties: {
      hypothesis_verdicts: {
        type: "array",
        description:
          "One verdict per accepted hypothesis. Use 'inconclusive' when the data does not cleanly support either direction.",
        items: {
          type: "object",
          properties: {
            hypothesis_id: {
              type: "string",
              description:
                "Must be one of the hypothesis IDs provided in the user prompt.",
            },
            verdict: {
              type: "string",
              enum: ["confirmed", "refuted", "inconclusive"],
            },
            confidence: {
              type: "string",
              enum: ["high", "medium", "low"],
            },
            summary: {
              type: "string",
              description: "1-2 sentences. The headline of the verdict.",
            },
            supporting_evidence: {
              type: "string",
              description:
                "2-3 sentences citing specific signal — counts, percentages, segment splits, verbatim quotes.",
            },
            caveats: {
              type: "array",
              items: { type: "string" },
              description:
                "Short bullet phrases. What limitations the researcher should hold in mind for THIS verdict.",
            },
            provenance: {
              type: "string",
              enum: DATA_PROVENANCE_VALUES,
              description:
                "D-055: where this verdict's claim came from. 'data-grounded' = supported by specific signal in the uploaded data (counts, percentages, quotes, segment splits cited in supporting_evidence). 'data-extrapolated' = plausible given the visible data but extends beyond what's strictly observable — use for verdicts on CSV samples where the full dataset would be required for a strict claim (the D-053 case). 'general-knowledge' = standard industry pattern with no specific support in the uploaded data. The UI renders 'general-knowledge' verdicts with a prominent banner — pitching this to a client requires the researcher to have validated it independently.",
            },
          },
          required: [
            "hypothesis_id",
            "verdict",
            "confidence",
            "summary",
            "supporting_evidence",
            "caveats",
            "provenance",
          ],
        },
      },
      emergent_patterns: {
        type: "array",
        minItems: 0,
        maxItems: 6,
        description:
          "Patterns the researcher did NOT explicitly hypothesise but the data reveals. Often the most valuable output.",
        items: {
          type: "object",
          properties: {
            pattern: { type: "string" },
            description: { type: "string" },
            evidence: { type: "string" },
            why_interesting: { type: "string" },
            priority: { type: "integer", minimum: 1, maximum: 5 },
          },
          required: [
            "pattern",
            "description",
            "evidence",
            "why_interesting",
            "priority",
          ],
        },
      },
      caveats: {
        type: "array",
        items: { type: "string" },
        description:
          "Study-wide caveats: sample size, segment coverage, response biases, methodological concerns.",
      },
    },
    required: ["hypothesis_verdicts", "emergent_patterns", "caveats"],
  },
  cache_control: { type: "ephemeral" as const },
};

export type GenerateAnalysisInput = {
  briefContent: string;
  acceptedHypotheses: Hypothesis[];
  acceptedPersonas: Persona[];
  questions: QuestionWithVariants[];
  data: AnalysisData[];
  projectId: string;
  briefId: string;
};

const TOTAL_DATA_BUDGET_CHARS = 80_000;

function summariseQuestion(q: QuestionWithVariants): string {
  const selected = q.selected_variant_id
    ? q.variants.find((v) => v.id === q.selected_variant_id)
    : undefined;
  const phrasing = selected?.statement ?? "(no variant selected)";
  return `- ${q.target_construct}: "${phrasing}"`;
}

export async function generateAnalysis(
  input: GenerateAnalysisInput,
): Promise<AnalysisGenerationResult> {
  const ctx = {
    project_id: input.projectId,
    brief_id: input.briefId,
    endpoint: "analysis-gen",
  };

  if (input.acceptedHypotheses.length === 0) {
    throw new Error(
      "Accept at least one hypothesis before running analysis.",
    );
  }
  if (input.data.length === 0) {
    throw new Error(
      "Upload at least one data source before running analysis.",
    );
  }

  // Enforce a context budget. We truncate the longest source first.
  const sources = [...input.data].sort((a, b) => b.char_count - a.char_count);
  let totalChars = sources.reduce((s, d) => s + d.char_count, 0);
  if (totalChars > TOTAL_DATA_BUDGET_CHARS) {
    const ratio = TOTAL_DATA_BUDGET_CHARS / totalChars;
    for (const src of sources) {
      const allowed = Math.floor(src.char_count * ratio);
      if (src.content.length > allowed) {
        src.content = src.content.slice(0, allowed) + "\n\n[…truncated for context budget…]";
      }
    }
  }

  const hypotheses = input.acceptedHypotheses
    .map(
      (h) =>
        `- id="${h.id}" | priority=${h.priority} | ${h.statement}\n  expected: ${h.expected_direction ?? "(not set)"}\n  test:     ${h.confirmation_criteria ?? "(not set)"}`,
    )
    .join("\n");

  const personas =
    input.acceptedPersonas.length > 0
      ? input.acceptedPersonas
          .map(
            (p) =>
              `- ${p.name}: ${p.description} (under-represents: ${p.under_represents ?? "n/a"})`,
          )
          .join("\n")
      : "(none accepted)";

  const questions = input.questions
    .filter((q) => q.status === "accepted")
    .map(summariseQuestion)
    .join("\n");

  const dataBlocks = input.data
    .map(
      (d) =>
        `<data id="${d.id}" type="${d.source_type}" title="${d.title}">\n${d.content}\n</data>`,
    )
    .join("\n\n");

  // D-053: when any CSV is in scope, the analyser sees a truncated text view
  // of the table (per the TOTAL_DATA_BUDGET_CHARS cap below). We can't run
  // statistical tests over the full file. Surfacing this in the prompt
  // header so the verdicts come out honestly calibrated.
  const hasCsv = input.data.some((d) => d.source_type === "csv");
  const csvFraming = hasCsv
    ? `\n\n# Notice on tabular data\nOne or more of the uploaded data sources is a CSV. You are seeing a TEXT EXCERPT of each CSV (typically ~5% of rows, truncated to fit the context budget). You cannot compute chi-square, regression, or significance tests over the full file from what you see. Counts and percentages you cite are illustrative of the visible rows, not population estimates. If a verdict would require a statistical test to support, set verdict='inconclusive' with a caveat naming the missing test.\n`
    : "";

  const userPrompt = `# Brief\n${input.briefContent}\n\n# Accepted hypotheses\n${hypotheses}\n\n# Recommended personas\n${personas}\n\n# Accepted questionnaire items (selected variants)\n${questions || "(none)"}${csvFraming}\n\n# Uploaded data sources\n${dataBlocks}\n\nCall analyse_data now. Verdict every accepted hypothesis. Surface 2-4 emergent patterns. Name study-wide caveats.`;

  const response = await tracedMessagesCreate(
    {
      model: MODELS.sonnet,
      max_tokens: 4096,
      system: [{ type: "text", text: ANALYSIS_SYSTEM }],
      tools: [ANALYSIS_TOOL],
      tool_choice: { type: "tool", name: ANALYSIS_TOOL.name },
      messages: [{ role: "user", content: userPrompt }],
    },
    ctx,
  );

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("Analysis did not produce a tool_use response");
  }

  const data = toolBlock.input as {
    hypothesis_verdicts: HypothesisVerdict[];
    emergent_patterns: EmergentPattern[];
    caveats: string[];
  };

  const validHypothesisIds = new Set(
    input.acceptedHypotheses.map((h) => h.id),
  );

  // Defensive filtering: only keep verdicts on hypotheses that were actually
  // passed in. Drop any hallucinated ID. Also normalise the provenance field
  // (D-055): if the model emitted a non-enum value, fall back to
  // 'general-knowledge' so we don't silently claim data support.
  const rawVerdicts = (data.hypothesis_verdicts ?? [])
    .filter((v) => validHypothesisIds.has(v.hypothesis_id))
    .map((v) => ({
      ...v,
      provenance: DATA_PROVENANCE_VALUES.includes(
        v.provenance as DataProvenance,
      )
        ? (v.provenance as DataProvenance)
        : ("general-knowledge" as DataProvenance),
    }));

  // D-050: verdict-direction-check. Independent Sonnet pass cross-checks
  // each verdict's prose direction against its label. Mismatches are
  // rewritten with an auto-appended caveat so the correction is visible.
  const hypothesesById = new Map(
    input.acceptedHypotheses.map((h) => [
      h.id,
      {
        statement: h.statement,
        expected_direction: h.expected_direction,
      },
    ]),
  );
  const verdicts = await rectifyVerdicts({
    verdicts: rawVerdicts,
    hypothesesById,
    projectId: input.projectId,
    briefId: input.briefId,
  });

  return {
    hypothesis_verdicts: verdicts,
    emergent_patterns: data.emergent_patterns ?? [],
    caveats: data.caveats ?? [],
  };
}
