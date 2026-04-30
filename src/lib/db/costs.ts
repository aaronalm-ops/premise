import { getSupabaseServer } from "@/lib/db/supabase";

export type CostRollup = {
  total_usd: number;
  call_count: number;
  total_input_tokens: number;
  total_cached_input_tokens: number;
  total_cache_creation_tokens: number;
  total_output_tokens: number;
  cache_hit_rate: number;
  by_endpoint: Array<{
    endpoint: string;
    service: string;
    call_count: number;
    cost_usd: number;
  }>;
};

export async function getProjectCostRollup(projectId: string): Promise<CostRollup> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("api_calls")
    .select(
      "service, endpoint, cost_usd, input_tokens, cached_input_tokens, cache_creation_tokens, output_tokens",
    )
    .eq("project_id", projectId);
  if (error) throw new Error(`getProjectCostRollup: ${error.message}`);

  const rows = data ?? [];
  let total_usd = 0;
  let total_input_tokens = 0;
  let total_cached_input_tokens = 0;
  let total_cache_creation_tokens = 0;
  let total_output_tokens = 0;

  const byKey = new Map<
    string,
    { endpoint: string; service: string; call_count: number; cost_usd: number }
  >();

  for (const r of rows as Array<{
    service: string;
    endpoint: string;
    cost_usd: number | string;
    input_tokens: number;
    cached_input_tokens: number;
    cache_creation_tokens: number;
    output_tokens: number;
  }>) {
    const cost = typeof r.cost_usd === "string" ? parseFloat(r.cost_usd) : r.cost_usd;
    total_usd += cost;
    total_input_tokens += r.input_tokens;
    total_cached_input_tokens += r.cached_input_tokens;
    total_cache_creation_tokens += r.cache_creation_tokens;
    total_output_tokens += r.output_tokens;

    const key = `${r.service}|${r.endpoint}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.call_count += 1;
      existing.cost_usd += cost;
    } else {
      byKey.set(key, {
        endpoint: r.endpoint,
        service: r.service,
        call_count: 1,
        cost_usd: cost,
      });
    }
  }

  const cacheable = total_input_tokens + total_cached_input_tokens;
  const cache_hit_rate = cacheable > 0 ? total_cached_input_tokens / cacheable : 0;

  return {
    total_usd,
    call_count: rows.length,
    total_input_tokens,
    total_cached_input_tokens,
    total_cache_creation_tokens,
    total_output_tokens,
    cache_hit_rate,
    by_endpoint: Array.from(byKey.values()).sort((a, b) => b.cost_usd - a.cost_usd),
  };
}
