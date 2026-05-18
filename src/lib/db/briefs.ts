import { getSupabaseServer } from "@/lib/db/supabase";
import type {
  Brief,
  CorpusSkew,
  ScopeClarifications,
  ScopeClarifierStatus,
  ScopeDimensions,
} from "@/lib/rag/types";

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
  scope_dimensions?: ScopeDimensions | null;
  scope_corpus_skew?: CorpusSkew | null;
  scope_clarifications?: ScopeClarifications | null;
  scope_clarifier_status?: ScopeClarifierStatus | null;
}): Promise<Brief> {
  const supabase = getSupabaseServer();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title !== undefined) patch.title = input.title;
  if (input.content !== undefined) patch.content = input.content;
  if (input.scope_dimensions !== undefined)
    patch.scope_dimensions = input.scope_dimensions;
  if (input.scope_corpus_skew !== undefined)
    patch.scope_corpus_skew = input.scope_corpus_skew;
  if (input.scope_clarifications !== undefined)
    patch.scope_clarifications = input.scope_clarifications;
  if (input.scope_clarifier_status !== undefined)
    patch.scope_clarifier_status = input.scope_clarifier_status;

  const { data, error } = await supabase
    .from("briefs")
    .update(patch)
    .eq("id", input.id)
    .select("*")
    .single();
  if (error) throw new Error(`updateBrief: ${error.message}`);
  return data as Brief;
}
