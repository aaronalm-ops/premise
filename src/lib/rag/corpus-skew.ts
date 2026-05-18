// D-049: detect whether the project's own corpus has a dominant value on any
// scope axis the brief left silent. If it does, the clarifier asks the
// researcher to confirm or override before scope inheritance runs.
//
// The public library is deliberately excluded from this check. The public
// library is a shared, curated resource and is assumed global-by-curation
// (see PUBLIC_CORPUS_TASKFORCE.md). If today's public library is regionally
// skewed, that's a curation defect to fix in the corpus — not a user-facing
// nudge. Surfacing public-library skew here would teach researchers to
// distrust the shared corpus, which is the opposite of what D-033/D-044 were
// designed to do.

import { MODELS } from "@/lib/llm/anthropic";
import { tracedMessagesCreate } from "@/lib/telemetry/tracer";
import { getSupabaseServer } from "@/lib/db/supabase";
import { SCOPE_AXES, type CorpusSkew, type ScopeAxis } from "@/lib/rag/types";

// Share threshold above which an axis counts as "skewed". 0.6 means a 60%+
// dominant value in a small project corpus triggers a clarifier nudge. Tuned
// against the ASEAN dogfood case (the 66-doc public library was ~85% ASEAN,
// the project's own corpus often ~70%) — anything lower than 0.5 produces
// nudges on noisy corpora; anything above 0.8 misses real skew.
const SKEW_THRESHOLD = 0.6;

// Max chunks to sample from the project corpus. The skew check is structural,
// not semantic — we need enough breadth to compute share, not depth on any
// one document. 30 samples covers a 30-doc project (1 per doc) or gives 2-3
// per doc on smaller projects.
const SKEW_SAMPLE_LIMIT = 30;

const CORPUS_SKEW_SYSTEM = `You are inspecting a sample of chunks from a researcher's project corpus to detect whether the corpus skews toward a specific value on any of five scope axes.

The five axes:
- geography:       region / market / country / city
- time_horizon:    time window the chunks discuss
- audience:        demographic or cohort
- channel:         channel / platform / touchpoint
- market_maturity: lifecycle stage of the market the chunks describe

For each axis, report:
- dominant: the single most common value across the chunks (one short noun phrase, e.g. "ASEAN", "Mass Affluent", "TikTok"). null if no clear dominant.
- share: a number between 0 and 1 — the fraction of the visible chunks that fit the dominant value. 0 when dominant is null.

# Rules
1. Be conservative. If chunks discuss multiple values roughly equally on an axis, dominant is null and share is 0.
2. Do NOT invent a value the chunks do not actually contain.
3. Do NOT treat a single chunk's mention as a corpus-wide skew. Require at least half the visible chunks to share the value before calling a dominant.

You have access to a tool called report_skew. You MUST call it. Do not produce free text.`;

const SKEW_TOOL = {
  name: "report_skew",
  description: "Reports the dominant value and its share for each of five scope axes across the sampled chunks.",
  input_schema: {
    type: "object" as const,
    properties: {
      geography: axisShape("Region / market / country / city skew."),
      time_horizon: axisShape("Time-window skew."),
      audience: axisShape("Demographic / cohort skew."),
      channel: axisShape("Channel / platform / touchpoint skew."),
      market_maturity: axisShape("Lifecycle / maturity-stage skew."),
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
      dominant: { type: ["string", "null"] },
      share: { type: "number", minimum: 0, maximum: 1 },
    },
    required: ["dominant", "share"],
  };
}

// Pulls a representative sample of chunks from the project's *own* documents.
// Public-library documents are not included (see file header). One chunk per
// document at most, ordered by document creation — this favours breadth over
// depth and avoids letting one big document dominate the share calculation.
async function sampleProjectCorpus(projectId: string): Promise<string[]> {
  const supabase = getSupabaseServer();
  const { data: docs, error: docsErr } = await supabase
    .from("documents")
    .select("id")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })
    .limit(SKEW_SAMPLE_LIMIT);
  if (docsErr) throw new Error(`sampleProjectCorpus: ${docsErr.message}`);
  if (!docs || docs.length === 0) return [];

  const docIds = docs.map((d) => d.id as string);
  const { data: chunks, error: chunksErr } = await supabase
    .from("chunks")
    .select("document_id, content, ordinal")
    .in("document_id", docIds)
    .eq("ordinal", 0);
  if (chunksErr) throw new Error(`sampleProjectCorpus: ${chunksErr.message}`);

  return (chunks ?? []).map((c) => (c.content as string).slice(0, 600));
}

export async function detectCorpusSkew(input: {
  projectId: string;
  briefId: string;
}): Promise<CorpusSkew> {
  const samples = await sampleProjectCorpus(input.projectId);
  if (samples.length < 3) {
    return {};
  }

  const corpusBlock = samples
    .map((s, i) => `<chunk i="${i}">\n${s}\n</chunk>`)
    .join("\n\n");

  const response = await tracedMessagesCreate(
    {
      model: MODELS.haiku,
      max_tokens: 512,
      system: [{ type: "text", text: CORPUS_SKEW_SYSTEM }],
      tools: [SKEW_TOOL],
      tool_choice: { type: "tool", name: SKEW_TOOL.name },
      messages: [
        {
          role: "user",
          content: `# Project corpus sample (${samples.length} chunks)\n${corpusBlock}\n\nCall report_skew now.`,
        },
      ],
    },
    {
      project_id: input.projectId,
      brief_id: input.briefId,
      endpoint: "corpus-skew",
    },
  );

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    return {};
  }
  const raw = toolBlock.input as Record<string, unknown>;

  const skew: CorpusSkew = {};
  for (const axis of SCOPE_AXES) {
    const state = raw[axis] as
      | { dominant?: unknown; share?: unknown }
      | undefined;
    const dominant =
      typeof state?.dominant === "string" && state.dominant.trim().length > 0
        ? state.dominant.trim()
        : null;
    const share = typeof state?.share === "number" ? state.share : 0;
    if (dominant && share >= SKEW_THRESHOLD) {
      skew[axis as ScopeAxis] = { dominant, share };
    }
  }
  return skew;
}
