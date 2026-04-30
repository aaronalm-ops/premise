// Voyage AI embeddings client — direct REST, no SDK dependency.
// Records each call into api_calls (telemetry) when a TraceContext is provided.

import { requireEnv } from "@/lib/env";
import { recordVoyage, type TraceContext } from "@/lib/telemetry/tracer";
import { withRetry } from "@/lib/api/retry";

const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";
const MODEL = "voyage-3";
const DIMENSIONS = 1024;

type VoyageInputType = "document" | "query";

type VoyageResponse = {
  data: Array<{ embedding: number[]; index: number }>;
  model: string;
  usage: { total_tokens: number };
};

export type EmbedResult = {
  embeddings: number[][];
  totalTokens: number;
};

class VoyageError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function embed(
  inputs: string[],
  inputType: VoyageInputType,
  context?: TraceContext,
): Promise<EmbedResult> {
  if (inputs.length === 0) {
    return { embeddings: [], totalTokens: 0 };
  }

  const start = Date.now();
  const res = await withRetry(
    async () => {
      const r = await fetch(VOYAGE_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${requireEnv("VOYAGE_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: inputs,
          model: MODEL,
          input_type: inputType,
        }),
      });
      if (!r.ok) {
        const body = await r.text();
        throw new VoyageError(
          r.status,
          `Voyage embedding failed (${r.status}): ${body}`,
        );
      }
      return r;
    },
    {
      onRetry: (attempt, err) =>
        console.warn(
          `Voyage retry ${attempt}: ${(err as Error).message}`,
        ),
    },
  );

  const json = (await res.json()) as VoyageResponse;
  const sorted = [...json.data].sort((a, b) => a.index - b.index);
  const embeddings = sorted.map((d) => d.embedding);

  for (const e of embeddings) {
    if (e.length !== DIMENSIONS) {
      throw new Error(
        `Voyage returned embedding with ${e.length} dims, expected ${DIMENSIONS}`,
      );
    }
  }

  const result: EmbedResult = { embeddings, totalTokens: json.usage.total_tokens };
  if (context) {
    void recordVoyage(result.totalTokens, context, Date.now() - start);
  }
  return result;
}

export const VOYAGE_DIMENSIONS = DIMENSIONS;
