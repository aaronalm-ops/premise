// Pricing constants for Anthropic and Voyage, in USD per million tokens.
// Update these when provider pricing changes.

type AnthropicModelPricing = {
  input: number;
  cached_input_read: number;
  cache_creation_5m: number;
  output: number;
};

const ANTHROPIC_PRICING: Record<string, AnthropicModelPricing> = {
  // Haiku 4.5 — cheap; default for verification, reranking, classification.
  "claude-haiku-4-5-20251001": {
    input: 1.0,
    cached_input_read: 0.1,
    cache_creation_5m: 1.25,
    output: 5.0,
  },
  // Sonnet 4.6 — synthesis-grade.
  "claude-sonnet-4-6": {
    input: 3.0,
    cached_input_read: 0.3,
    cache_creation_5m: 3.75,
    output: 15.0,
  },
};

export const VOYAGE_PRICING_PER_M = 0.06;

export function computeAnthropicCost(input: {
  model: string;
  input_tokens: number;
  cached_input_tokens: number;
  cache_creation_tokens: number;
  output_tokens: number;
}): number {
  // Match by exact id, falling back to a haiku-default if model unknown.
  const pricing =
    ANTHROPIC_PRICING[input.model] ??
    ANTHROPIC_PRICING["claude-haiku-4-5-20251001"];

  const inputCost = (input.input_tokens * pricing.input) / 1_000_000;
  const cachedReadCost =
    (input.cached_input_tokens * pricing.cached_input_read) / 1_000_000;
  const cacheCreationCost =
    (input.cache_creation_tokens * pricing.cache_creation_5m) / 1_000_000;
  const outputCost = (input.output_tokens * pricing.output) / 1_000_000;

  return inputCost + cachedReadCost + cacheCreationCost + outputCost;
}

export function computeVoyageCost(tokens: number): number {
  return (tokens * VOYAGE_PRICING_PER_M) / 1_000_000;
}
