// D-049: Layer 1 of the brief-scope discipline — Haiku reads the brief alone
// (no corpus) and reports which of the five scope axes the brief explicitly
// specifies, plus the verbatim phrase it found on each specified axis.
//
// Why Haiku, not Sonnet:
//   * Detection is a structural reading task, not a synthesis task.
//   * The prompt is short, the output is fixed-shape, and the call runs once
//     per brief save. Haiku is the budget-correct default per CLAUDE.md
//     non-negotiable #3.
//
// Why the corpus is not in this pass:
//   * The fix we're shipping is *scope must come from the brief, not the
//     corpus*. If the corpus were in this pass, we'd just reintroduce the
//     leak we're closing — Haiku would pattern-match scope from the chunks
//     it saw.
//
// The downstream consumer (the scope API route) cross-references this result
// against the project's own corpus skew (see corpus-skew.ts) to decide
// whether a clarifier is needed.

import { MODELS } from "@/lib/llm/anthropic";
import { tracedMessagesCreate } from "@/lib/telemetry/tracer";
import { SCOPE_AXES, type ScopeDimensions } from "@/lib/rag/types";

const SCOPE_DETECTOR_SYSTEM = `You are reading a research brief written by a market/consumer insights researcher.

Your only job is to report which of five scope axes the brief explicitly specifies, and what verbatim phrase from the brief specifies each one.

The five axes:
- geography:       a region, market, country, or city (e.g. "ASEAN", "UK", "Mumbai metros")
- time_horizon:    a time window or trend horizon (e.g. "past 12 months", "5-year shift", "post-pandemic")
- audience:        the demographic or cohort scope (e.g. "Gen Z women", "Mass Affluent millennials")
- channel:         a specific channel, platform, or touchpoint (e.g. "in-store", "mobile-first", "TikTok")
- market_maturity: the lifecycle stage (e.g. "emerging market", "saturated category")

# Rules
1. specified = true only if the brief contains a phrase that clearly fixes that axis. A passing mention is not enough.
2. brief_mention is the verbatim phrase from the brief that pins the axis. null when specified = false.
3. Do NOT infer scope from outside the brief. If the brief says "Gen Z vs Millennials" with no geography, geography is unspecified — even if the topic typically has a regional context.
4. Do NOT confuse audience with geography. "Gen Z women in ASEAN" specifies both; "Gen Z women" alone specifies only audience.

You have access to a tool called detect_scope. You MUST call it. Do not produce free text.`;

const DETECT_TOOL = {
  name: "detect_scope",
  description: "Reports which scope axes the brief specifies and the verbatim phrase that specifies each.",
  input_schema: {
    type: "object" as const,
    properties: {
      geography: axisShape("Region / market / country / city scope."),
      time_horizon: axisShape("Time window or trend horizon."),
      audience: axisShape("Demographic / cohort scope."),
      channel: axisShape("Channel / platform / touchpoint scope."),
      market_maturity: axisShape("Lifecycle / category-maturity scope."),
    },
    required: [...SCOPE_AXES],
  },
  cache_control: { type: "ephemeral" as const },
};

function axisShape(description: string) {
  return {
    type: "object",
    description,
    properties: {
      specified: { type: "boolean" },
      brief_mention: { type: ["string", "null"] },
    },
    required: ["specified", "brief_mention"],
  };
}

export async function detectScopeDimensions(input: {
  briefContent: string;
  projectId: string;
  briefId: string;
}): Promise<ScopeDimensions> {
  const response = await tracedMessagesCreate(
    {
      model: MODELS.haiku,
      max_tokens: 512,
      system: [{ type: "text", text: SCOPE_DETECTOR_SYSTEM }],
      tools: [DETECT_TOOL],
      tool_choice: { type: "tool", name: DETECT_TOOL.name },
      messages: [
        {
          role: "user",
          content: `# Research brief\n${input.briefContent}\n\nCall detect_scope now.`,
        },
      ],
    },
    {
      project_id: input.projectId,
      brief_id: input.briefId,
      endpoint: "scope-detect",
    },
  );

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("Scope detection did not produce a tool_use response");
  }

  const raw = toolBlock.input as Record<string, unknown>;
  const dimensions = {} as ScopeDimensions;
  for (const axis of SCOPE_AXES) {
    const state = raw[axis] as
      | { specified?: unknown; brief_mention?: unknown }
      | undefined;
    dimensions[axis] = {
      specified: Boolean(state?.specified),
      brief_mention:
        typeof state?.brief_mention === "string" ? state.brief_mention : null,
    };
  }
  return dimensions;
}
