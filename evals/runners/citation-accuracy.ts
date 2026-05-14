// Citation-accuracy probe runner (D-042, taskforce critique 8a).
//
// Runs each probe's question through the full /ask pipeline, then for every
// claim that survives the pipeline's Haiku verifier, asks an INDEPENDENT
// Sonnet judge whether the cited chunks actually support the claim. This is
// a cross-check on the existing verifier — if Sonnet disagrees with Haiku
// on a claim that already shipped, we've caught a false-positive in the
// strict-abstention chassis.
//
// Distinct from the runtime verifier in src/lib/rag/verification.ts:
// - Different model (Sonnet, not Haiku) — stricter judge
// - Different prompt — emphasises "no implication, no near-supports"
// - Runs in eval, not in the user-facing flow — extra cost is acceptable
//   because the test only runs in CI / on-demand

import { MODELS, getAnthropic } from "@/lib/llm/anthropic";
import { ask } from "@/lib/rag/pipeline";
import { withRetry } from "@/lib/api/retry";
import { loadProbesOfType } from "../lib/load-probes";
import type {
  CitationAccuracyProbe,
  ProbeResult,
} from "../lib/types";
import type { Claim, RetrievedChunk } from "@/lib/rag/types";

const JUDGE_SYSTEM = `You are an independent fact-checking judge. You are stricter than a typical reviewer because the system you are auditing already passed an internal verifier — your job is to catch what that verifier might have missed.

For EACH claim, decide whether the cited chunks DIRECTLY support it.

A claim is supported only if a careful reader could point at specific words in the cited chunks and say "yes, exactly this." A claim is NOT supported if:
- The chunks merely mention the same topic
- The chunks imply something nearby but not identical
- The claim adds detail, qualifiers, or magnitudes the chunks don't contain
- The claim generalises beyond what the chunks say
- The chunks are about the same entities but make a different point

Return one boolean per claim in the same order via the verify tool.`;

const JUDGE_TOOL = {
  name: "judge_claim_support",
  description:
    "Independent strict judge. Returns one boolean per input claim — true only if the cited chunks DIRECTLY support the claim.",
  input_schema: {
    type: "object" as const,
    properties: {
      verdicts: {
        type: "array",
        items: { type: "boolean" },
      },
    },
    required: ["verdicts"],
  },
};

export async function runCitationAccuracy(
  projectId: string,
): Promise<ProbeResult[]> {
  const probes = loadProbesOfType<CitationAccuracyProbe>("citation-accuracy");
  const out: ProbeResult[] = [];
  for (const probe of probes) {
    out.push(await runOne(probe, projectId));
  }
  return out;
}

async function runOne(
  probe: CitationAccuracyProbe,
  projectId: string,
): Promise<ProbeResult> {
  const start = Date.now();
  const reasons: string[] = [];

  try {
    const result = await ask(probe.question, projectId);
    const claims = result.answer.claims;

    if (claims.length < probe.expects.min_claims) {
      reasons.push(
        `expected at least ${probe.expects.min_claims} claims, got ${claims.length} — skipping judge`,
      );
      return {
        probe_id: probe.id,
        probe_type: "citation-accuracy",
        description: probe.description,
        passed: false,
        reasons,
        duration_ms: Date.now() - start,
      };
    }

    const verdicts = await judgeClaims(claims, result.retrieved_chunks);
    const supported = verdicts.filter((v) => v === true).length;
    const supportRate = claims.length > 0 ? supported / claims.length : 0;

    if (supportRate < probe.expects.min_support_rate) {
      reasons.push(
        `support_rate ${(supportRate * 100).toFixed(0)}% below threshold ${(probe.expects.min_support_rate * 100).toFixed(0)}% (${supported}/${claims.length} claims supported by independent Sonnet judge)`,
      );

      // Surface which claims failed so the failure log is actionable.
      claims.forEach((c, i) => {
        if (verdicts[i] === false) {
          reasons.push(`  - claim ${i + 1} rejected by judge: "${truncate(c.text, 120)}"`);
        }
      });
    }

    return {
      probe_id: probe.id,
      probe_type: "citation-accuracy",
      description: probe.description,
      passed: reasons.length === 0,
      reasons,
      duration_ms: Date.now() - start,
    };
  } catch (err) {
    return {
      probe_id: probe.id,
      probe_type: "citation-accuracy",
      description: probe.description,
      passed: false,
      reasons: [`runtime error: ${(err as Error).message}`],
      duration_ms: Date.now() - start,
    };
  }
}

async function judgeClaims(
  claims: Claim[],
  chunks: RetrievedChunk[],
): Promise<boolean[]> {
  if (claims.length === 0) return [];

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

  const client = getAnthropic();
  const response = await withRetry(() =>
    client.messages.create({
      model: MODELS.sonnet,
      max_tokens: 300,
      system: JUDGE_SYSTEM,
      tools: [JUDGE_TOOL],
      tool_choice: { type: "tool", name: JUDGE_TOOL.name },
      messages: [
        {
          role: "user",
          content: `Judge ${claims.length} claim(s) for direct citation support. Return exactly ${claims.length} boolean(s).\n\n${claimBlocks}`,
        },
      ],
    }),
  );

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    // If the judge fails, treat all as unsupported — fail loud rather than
    // silently pass.
    return claims.map(() => false);
  }
  const data = toolBlock.input as { verdicts?: boolean[] };
  const v = data.verdicts ?? [];
  while (v.length < claims.length) v.push(false);
  return v.slice(0, claims.length);
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
