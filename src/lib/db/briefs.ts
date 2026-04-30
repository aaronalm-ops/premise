import { getSupabaseServer } from "@/lib/db/supabase";
import type { Brief } from "@/lib/rag/types";

export async function listBriefs(projectId: string): Promise<Brief[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("briefs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listBriefs: ${error.message}`);
  return (data ?? []) as Brief[];
}

export async function getBrief(id: string): Promise<Brief | null> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("briefs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getBrief: ${error.message}`);
  return (data ?? null) as Brief | null;
}

export async function createBrief(input: {
  projectId: string;
  title?: string | null;
  content: string;
}): Promise<Brief> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("briefs")
    .insert({
      project_id: input.projectId,
      title: input.title ?? null,
      content: input.content,
    })
    .select("*")
    .single();
  if (error) throw new Error(`createBrief: ${error.message}`);
  return data as Brief;
}

export async function updateBrief(input: {
  id: string;
  title?: string | null;
  content?: string;
}): Promise<Brief> {
  const supabase = getSupabaseServer();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title !== undefined) patch.title = input.title;
  if (input.content !== undefined) patch.content = input.content;

  const { data, error } = await supabase
    .from("briefs")
    .update(patch)
    .eq("id", input.id)
    .select("*")
    .single();
  if (error) throw new Error(`updateBrief: ${error.message}`);
  return data as Brief;
}
