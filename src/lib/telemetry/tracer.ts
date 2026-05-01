// Telemetry tracer for Anthropic and Voyage calls.
// Wraps the underlying SDK call, records token usage + cost into api_calls.
// Failures in telemetry persistence MUST NOT affect the user-facing flow —
// we swallow errors and log to console.

import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic } from "@/lib/llm/anthropic";
import { getSupabaseServer } from "@/lib/db/supabase";
import { computeAnthropicCost, computeVoyageCost } from "./pricing";
import { withRetry } from "@/lib/api/retry";
import { promptVersionFor } from "@/lib/llm/prompt-versions";

export type TraceContext = {
  project_id?: string | null;
  brief_id?: string | null;
  endpoint: string;
};

type CreateParams = Anthropic.Messages.MessageCreateParamsNonStreaming;
type Message = Anthropic.Messages.Message;

export async function tracedMessagesCreate(
  params: CreateParams,
  context: TraceContext,
): Promise<Message> {
  const start = Date.now();
  const client = getAnthropic();
  const response = await withRetry(
    () => client.messages.create(params) as Promise<Message>,
    {
      onRetry: (attempt, err) =>
        console.warn(
          `Anthropic retry ${attempt} (${context.endpoint}): ${(err as Error).message}`,
        ),
    },
  );
  const duration_ms = Date.now() - start;

  void recordAnthropic(response, params.model, context, duration_ms).catch(
    (err) => {
      console.warn("telemetry: failed to record Anthropic call", err);
    },
  );

  return response;
}

async function recordAnthropic(
  response: Message,
  model: string,
  context: TraceContext,
  duration_ms: number,
): Promise<void> {
  const usage = response.usage;
  const cached_input_tokens = usage.cache_read_input_tokens ?? 0;
  const cache_creation_tokens = usage.cache_creation_input_tokens ?? 0;

  const cost_usd = computeAnthropicCost({
    model,
    input_tokens: usage.input_tokens,
    cached_input_tokens,
    cache_creation_tokens,
    output_tokens: usage.output_tokens,
  });

  const supabase = getSupabaseServer();
  const { error } = await supabase.from("api_calls").insert({
    project_id: context.project_id ?? null,
    brief_id: context.brief_id ?? null,
    service: "anthropic",
    endpoint: context.endpoint,
    model,
    input_tokens: usage.input_tokens,
    cached_input_tokens,
    cache_creation_tokens,
    output_tokens: usage.output_tokens,
    cost_usd,
    duration_ms,
    prompt_version: promptVersionFor(context.endpoint),
  });
  if (error) throw new Error(error.message);
}

export async function recordVoyage(
  totalTokens: number,
  context: TraceContext,
  duration_ms: number,
): Promise<void> {
  const cost_usd = computeVoyageCost(totalTokens);
  const supabase = getSupabaseServer();
  const { error } = await supabase.from("api_calls").insert({
    project_id: context.project_id ?? null,
    brief_id: context.brief_id ?? null,
    service: "voyage",
    endpoint: context.endpoint,
    model: "voyage-3",
    input_tokens: totalTokens,
    cached_input_tokens: 0,
    cache_creation_tokens: 0,
    output_tokens: 0,
    cost_usd,
    duration_ms,
    prompt_version: promptVersionFor(context.endpoint),
  });
  if (error) {
    console.warn("telemetry: failed to record Voyage call", error.message);
  }
}
