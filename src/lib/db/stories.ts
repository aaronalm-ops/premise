import { getSupabaseServer } from "@/lib/db/supabase";
import type {
  HypothesisStatus,
  StoryAngle,
  StoryAngleDraft,
} from "@/lib/rag/types";

export async function listStoryAngles(briefId: string): Promise<StoryAngle[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("story_angles")
    .select("*")
    .eq("brief_id", briefId)
    .order("ordinal", { ascending: true });
  if (error) throw new Error(`listStoryAngles: ${error.message}`);
  return (data ?? []) as StoryAngle[];
}

export async function getStoryAngle(id: string): Promise<StoryAngle | null> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("story_angles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getStoryAngle: ${error.message}`);
  return (data ?? null) as StoryAngle | null;
}

export async function replaceProposedStoryAngles(input: {
  briefId: string;
  projectId: string;
  drafts: StoryAngleDraft[];
}): Promise<StoryAngle[]> {
  const supabase = getSupabaseServer();

  if (input.drafts.length === 0) {
    await supabase
      .from("story_angles")
      .delete()
      .eq("brief_id", input.briefId)
      .eq("status", "proposed");
    return [];
  }

  await supabase
    .from("story_angles")
    .delete()
    .eq("brief_id", input.briefId)
    .eq("status", "proposed");

  const { data: existing } = await supabase
    .from("story_angles")
    .select("ordinal")
    .eq("brief_id", input.briefId)
    .order("ordinal", { ascending: false })
    .limit(1);
  const startOrdinal = (existing?.[0]?.ordinal ?? -1) + 1;

  const sorted = [...input.drafts].sort((a, b) => b.priority - a.priority);
  const rows = sorted.map((d, i) => ({
    brief_id: input.briefId,
    project_id: input.projectId,
    ordinal: startOrdinal + i,
    title: d.title,
    target_audience: d.target_audience,
    lede: d.lede,
    beats: d.beats,
    supporting_hypothesis_ids: d.supporting_hypothesis_ids,
    supporting_emergent_patterns: d.supporting_emergent_patterns,
    omits: d.omits,
    priority: d.priority,
    status: "proposed" as const,
  }));

  const { data, error } = await supabase
    .from("story_angles")
    .insert(rows)
    .select("*");
  if (error) throw new Error(`replaceProposedStoryAngles: ${error.message}`);
  return (data ?? []) as StoryAngle[];
}

export async function updateStoryAngle(input: {
  id: string;
  status?: HypothesisStatus;
  draft_outline?: string | null;
  rejection_reason?: string | null;
}): Promise<StoryAngle> {
  const supabase = getSupabaseServer();
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.status !== undefined) patch.status = input.status;
  if (input.draft_outline !== undefined) patch.draft_outline = input.draft_outline;
  if (input.rejection_reason !== undefined)
    patch.rejection_reason = input.rejection_reason;

  const { data, error } = await supabase
    .from("story_angles")
    .update(patch)
    .eq("id", input.id)
    .select("*")
    .single();
  if (error) throw new Error(`updateStoryAngle: ${error.message}`);
  return data as StoryAngle;
}
