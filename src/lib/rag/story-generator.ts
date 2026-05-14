// Story angle + outline generation pipelines.
// Both reuse the strict-output chassis (D-010 / D-018 / D-034) — Sonnet with
// forced tool_use. The angle generator's evidence-citation requirement
// keeps the "options not answers" principle (D-019) intact at the story layer.

import { MODELS } from "@/lib/llm/anthropic";
import { tracedMessagesCreate } from "@/lib/telemetry/tracer";
import { OUTLINE_SYSTEM, STORY_ANGLE_SYSTEM } from "@/lib/prompts/story";
import type {
  Analysis,
  Hypothesis,
  Persona,
  Recommendation,
  StoryAngle,
  StoryAngleDraft,
} from "@/lib/rag/types";

// ============================================================================
// 1. STORY ANGLE GENERATOR
// ============================================================================

const ANGLE_TOOL = {
  name: "propose_story_angles",
  description:
    "Returns 3-4 ranked story angles for thought-leadership output. Each angle has a named audience, lede, supporting beats, evidence chain, and an honest 'omits' disclosure.",
  input_schema: {
    type: "object" as const,
    properties: {
      angles: {
        type: "array",
        minItems: 3,
        maxItems: 4,
        items: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "5-10 word punchy article headline.",
            },
            target_audience: {
              type: "string",
              description:
                "Named segment + their job-to-be-done. One sentence.",
            },
            lede: {
              type: "string",
              description:
                "1-2 sentences. The opening hook for the eventual article.",
            },
            beats: {
              type: "array",
              minItems: 3,
              maxItems: 3,
              description: "Three story beats, each a short paragraph.",
              items: { type: "string" },
            },
            supporting_hypothesis_ids: {
              type: "array",
              items: { type: "string" },
              description:
                "Hypothesis IDs this angle leans on. Must reference IDs from the prompt.",
            },
            supporting_emergent_patterns: {
              type: "array",
              items: { type: "string" },
              description:
                "Emergent-pattern names (from the analysis, if any) this angle leans on.",
            },
            omits: {
              type: "string",
              description:
                "What this angle deliberately leaves out. Specific. Mandatory.",
            },
            priority: {
              type: "integer",
              minimum: 1,
              maximum: 5,
              description:
                "5 = most likely to land with named audience. Reserve sparingly.",
            },
          },
          required: [
            "title",
            "target_audience",
            "lede",
            "beats",
            "supporting_hypothesis_ids",
            "supporting_emergent_patterns",
            "omits",
            "priority",
          ],
        },
      },
    },
    required: ["angles"],
  },
  cache_control: { type: "ephemeral" as const },
};

export type GenerateAnglesInput = {
  briefContent: string;
  acceptedHypotheses: Hypothesis[];
  acceptedPersonas: Persona[];
  analysis: Analysis | null;
  acceptedRecommendation: Recommendation | null;
  projectId: string;
  briefId: string;
};

export type GenerateAnglesResult = {
  drafts: StoryAngleDraft[];
};

export async function generateStoryAngles(
  input: GenerateAnglesInput,
): Promise<GenerateAnglesResult> {
  if (input.acceptedHypotheses.length === 0) {
    throw new Error(
      "Accept at least one hypothesis before generating story angles.",
    );
  }

  const ctx = {
    project_id: input.projectId,
    brief_id: input.briefId,
    endpoint: "story-gen",
  };

  const hypothesesText = input.acceptedHypotheses
    .map((h) => {
      const verdict = input.analysis?.hypothesis_verdicts.find(
        (v) => v.hypothesis_id === h.id,
      );
      const verdictTag = verdict
        ? ` [verdict: ${verdict.verdict.toUpperCase()} (${verdict.confidence}) — ${verdict.summary}]`
        : "";
      return `- id="${h.id}" priority=${h.priority} :: ${h.statement}${verdictTag}`;
    })
    .join("\n");

  const patternsText = (input.analysis?.emergent_patterns ?? [])
    .sort((a, b) => b.priority - a.priority)
    .map(
      (p) =>
        `- "${p.pattern}" (priority ${p.priority}): ${p.description} — Why it matters: ${p.why_interesting}`,
    )
    .join("\n");

  const personasText =
    input.acceptedPersonas.length > 0
      ? input.acceptedPersonas
          .map(
            (p) =>
              `- ${p.name}: ${p.description} (under-represents: ${p.under_represents ?? "n/a"})`,
          )
          .join("\n")
      : "(none accepted)";

  const caveatsText = input.analysis?.caveats?.length
    ? input.analysis.caveats.map((c) => `- ${c}`).join("\n")
    : "(no analysis caveats — analysis hasn't run, or no study-wide issues flagged)";

  const recommendationText = input.acceptedRecommendation
    ? `Insight: ${input.acceptedRecommendation.insight}\nAction: ${input.acceptedRecommendation.recommended_action}\nConfidence: ${input.acceptedRecommendation.confidence}\nCaveats: ${input.acceptedRecommendation.caveats.join("; ") || "none recorded"}\n\nEvery angle's evidence chain MUST ladder up to this insight + action. If an angle can't connect to it, drop it.`
    : "(no accepted recommendation — angles draw directly from hypotheses + emergent patterns)";

  const userPrompt = `# Brief\n${input.briefContent}\n\n# Accepted recommendation (the spine the angles must ladder up to)\n${recommendationText}\n\n# Accepted hypotheses (with verdicts where available)\n${hypothesesText}\n\n# Emergent patterns from analysis\n${patternsText || "(none yet — analysis hasn't surfaced emergent patterns)"}\n\n# Recommended personas\n${personasText}\n\n# Study caveats\n${caveatsText}\n\nCall propose_story_angles now with 3-4 ranked angles. Each angle must cite at least one hypothesis_id or emergent pattern.`;

  const response = await tracedMessagesCreate(
    {
      model: MODELS.sonnet,
      max_tokens: 4096,
      system: [{ type: "text", text: STORY_ANGLE_SYSTEM }],
      tools: [ANGLE_TOOL],
      tool_choice: { type: "tool", name: ANGLE_TOOL.name },
      messages: [{ role: "user", content: userPrompt }],
    },
    ctx,
  );

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("Story angle generation did not produce a tool_use response");
  }

  const data = toolBlock.input as { angles: StoryAngleDraft[] };
  if (!Array.isArray(data.angles)) {
    throw new Error("Story angle generation returned wrong shape");
  }

  const validHypothesisIds = new Set(input.acceptedHypotheses.map((h) => h.id));

  // D-041 cascade: if an angle's evidence chain touches a hypothesis that
  // was revised AFTER the analysis ran, fold the deviation report into the
  // angle's omits field. This is how the integrity flows all the way to
  // the final deck — the omits field is part of the angle, surfaces in the
  // UI, and feeds the outline drafter via input.angle.omits. The honest
  // research tradition treats post-hoc revisions as audit-worthy; making
  // them part of the story-angle artefact rather than a footnote elsewhere
  // is the same instinct as D-036's mandatory-omits and D-018's
  // mandatory-citations: schema-enforced honesty.
  const hypById = new Map(input.acceptedHypotheses.map((h) => [h.id, h]));

  const drafts = data.angles
    .map((a) => {
      const supportingIds = (a.supporting_hypothesis_ids ?? []).filter((id) =>
        validHypothesisIds.has(id),
      );

      const revisionNotes: string[] = [];
      for (const hid of supportingIds) {
        const h = hypById.get(hid);
        if (h?.revised_after_analysis) {
          const label = `H${h.ordinal + 1}`;
          const rationale = h.revision_rationale?.trim();
          revisionNotes.push(
            rationale
              ? `${label} was revised after analysis (rationale: ${rationale})`
              : `${label} was revised after analysis`,
          );
        }
      }

      const omits = revisionNotes.length
        ? `${a.omits.trim()} ${revisionNotes.map((n) => `[Deviation: ${n}.]`).join(" ")}`.trim()
        : a.omits;

      return {
        ...a,
        supporting_hypothesis_ids: supportingIds,
        supporting_emergent_patterns: a.supporting_emergent_patterns ?? [],
        beats: (a.beats ?? []).slice(0, 3),
        omits,
      };
    })
    .filter(
      (a) =>
        a.supporting_hypothesis_ids.length > 0 ||
        a.supporting_emergent_patterns.length > 0,
    );

  return { drafts };
}

// ============================================================================
// 2. OUTLINE GENERATOR
// ============================================================================

const OUTLINE_TOOL = {
  name: "draft_outline",
  description:
    "Returns a structured thought-leadership outline (subtitle, intro, 4-6 body sections, closing) that will render to markdown.",
  input_schema: {
    type: "object" as const,
    properties: {
      subtitle: {
        type: "string",
        description: "One sentence that adds tension to the title.",
      },
      intro: {
        type: "string",
        description: "2-3 paragraphs setting up the question and audience.",
      },
      sections: {
        type: "array",
        minItems: 4,
        maxItems: 6,
        items: {
          type: "object",
          properties: {
            heading: { type: "string" },
            content: {
              type: "string",
              description: "2-3 paragraphs of body text.",
            },
          },
          required: ["heading", "content"],
        },
      },
      closing: {
        type: "string",
        description:
          "Closing section: 1-2 paragraphs naming a specific call-to-action or follow-up question for the named audience.",
      },
    },
    required: ["subtitle", "intro", "sections", "closing"],
  },
  cache_control: { type: "ephemeral" as const },
};

type OutlinePayload = {
  subtitle: string;
  intro: string;
  sections: Array<{ heading: string; content: string }>;
  closing: string;
};

export type DraftOutlineInput = {
  angle: StoryAngle;
  briefContent: string;
  analysis: Analysis | null;
  projectId: string;
  briefId: string;
};

export async function draftOutline(input: DraftOutlineInput): Promise<string> {
  const ctx = {
    project_id: input.projectId,
    brief_id: input.briefId,
    endpoint: "story-outline",
  };

  const verdictsText = input.analysis?.hypothesis_verdicts?.length
    ? input.analysis.hypothesis_verdicts
        .map(
          (v) =>
            `- ${v.verdict.toUpperCase()} (${v.confidence}) — ${v.summary} :: ${v.supporting_evidence}`,
        )
        .join("\n")
    : "(no analysis verdicts available — write more cautiously)";

  const patternsText = input.analysis?.emergent_patterns?.length
    ? input.analysis.emergent_patterns
        .map((p) => `- ${p.pattern}: ${p.description} (evidence: ${p.evidence})`)
        .join("\n")
    : "(no emergent patterns)";

  const userPrompt = `# Story angle to develop\nTitle: ${input.angle.title}\nAudience: ${input.angle.target_audience}\nLede: ${input.angle.lede}\n\nBeats:\n${input.angle.beats.map((b, i) => `${i + 1}. ${b}`).join("\n")}\n\nOmits (be honest about this in the writing): ${input.angle.omits}\n\n# Brief\n${input.briefContent}\n\n# Analysis verdicts\n${verdictsText}\n\n# Emergent patterns\n${patternsText}\n\nCall draft_outline now.`;

  const response = await tracedMessagesCreate(
    {
      model: MODELS.sonnet,
      max_tokens: 4096,
      system: [{ type: "text", text: OUTLINE_SYSTEM }],
      tools: [OUTLINE_TOOL],
      tool_choice: { type: "tool", name: OUTLINE_TOOL.name },
      messages: [{ role: "user", content: userPrompt }],
    },
    ctx,
  );

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("Outline generation did not produce a tool_use response");
  }

  const payload = toolBlock.input as OutlinePayload;
  return renderOutlineToMarkdown(input.angle, payload);
}

function renderOutlineToMarkdown(
  angle: StoryAngle,
  payload: OutlinePayload,
): string {
  const lines: string[] = [];
  lines.push(`# ${angle.title}`);
  if (payload.subtitle) lines.push(`> ${payload.subtitle}`);
  lines.push("");
  lines.push(`*For: ${angle.target_audience}*`);
  lines.push("");
  lines.push(`**${angle.lede}**`);
  lines.push("");
  lines.push(payload.intro);
  lines.push("");
  for (const s of payload.sections) {
    lines.push(`## ${s.heading}`);
    lines.push("");
    lines.push(s.content);
    lines.push("");
  }
  lines.push("## What this means for you");
  lines.push("");
  lines.push(payload.closing);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(
    `*This outline deliberately omits: ${angle.omits}*`,
  );
  return lines.join("\n");
}
