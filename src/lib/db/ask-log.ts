import { getSupabaseServer } from "@/lib/db/supabase";
import type { AskResult } from "@/lib/rag/types";

export type AskLogEntry = {
  id: string;
  project_id: string;
  user_id: string | null;
  question: string;
  answer: AskResult["answer"];
  retrieved_chunks: AskResult["retrieved_chunks"];
  used_chunk_ids: string[];
  cost_estimate_usd: number;
  duration_ms: number | null;
  created_at: string;
};

export async function appendAsk(input: {
  projectId: string;
  userId: string | null;
  question: string;
  result: AskResult;
  durationMs?: number;
}): Promise<AskLogEntry> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("ask_log")
    .insert({
      project_id: input.projectId,
      user_id: input.userId,
      question: input.question,
      answer: input.result.answer,
      retrieved_chunks: input.result.retrieved_chunks,
      used_chunk_ids: input.result.used_chunk_ids,
      cost_estimate_usd: input.result.cost_estimate_usd ?? 0,
      duration_ms: input.durationMs ?? null,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(`appendAsk: ${error?.message}`);
  return data as AskLogEntry;
}

export async function listRecentAsks(
  projectId: string,
  limit = 20,
): Promise<AskLogEntry[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("ask_log")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listRecentAsks: ${error.message}`);
  // Reverse so the UI can show oldest -> newest naturally.
  return ((data ?? []) as AskLogEntry[]).reverse();
}

export async function deleteAsk(id: string): Promise<void> {
  const supabase = getSupabaseServer();
  const { error } = await supabase.from("ask_log").delete().eq("id", id);
  if (error) throw new Error(`deleteAsk: ${error.message}`);
}
