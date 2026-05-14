import { getSupabaseServer } from "@/lib/db/supabase";
import type {
  HypothesisStatus,
  Recommendation,
  RecommendationDraft,
} from "@/lib/rag/types";

export async function listRecommendations(
  briefId: string,
): Promise<Recommendation[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("recommendations")
    .select("*")
    .eq("brief_id", briefId)
    .order("ordinal", { ascending: true });
  if (error) throw new Error(`listRecommendations: ${error.message}`);
  return (data ?? []) as Recommendation[];
}

export async function getRecommendation(
  id: string,
): Promise<Recommendation | null> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("recommendations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getRecommendation: ${error.message}`);
  return (data ?? null) as Recommendation | null;
}

export async function listAcceptedRecommendations(
  briefId: string,
): Promise<Recommendation[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("recommendations")
    .select("*")
    .eq("brief_id", briefId)
    .eq("status", "accepted")
    .order("ordinal", { ascending: true });
  if (error) throw new Error(`listAcceptedRecommendations: ${error.message}`);
  return (data ?? []) as Recommendation[];
}

export async function replaceProposedRecommendations(input: {
  briefId: string;
  projectId: string;
  drafts: RecommendationDraft[];
}): Promise<Recommendation[]> {
  const supabase = getSupabaseServer();

  // Atomic replace via the SQL function (D-026 pattern). The function
  // wraps delete-then-insert in one transaction so a partial regenerate
  // cannot leave the table half-cleared.
  const { data, error } = await supabase.rpc(
    "replace_proposed_recommendations",
    {
      p_brief_id: input.briefId,
      p_project_id: input.projectId,
      p_drafts: input.drafts,
    },
  );
  if (error) throw new Error(`replaceProposedRecommendations: ${error.message}`);
  return (data ?? []) as Recommendation[];
}

export async function updateRecommendation(input: {
  id: string;
  status?: HypothesisStatus;
  insight?: string;
  recommended_action?: string;
  caveats?: string[];
  rejection_reason?: string | null;
}): Promise<Recommendation> {
  const supabase = getSupabaseServer();
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.status !== undefined) patch.status = input.status;
  if (input.insight !== undefined) patch.insight = input.insight;
  if (input.recommended_action !== undefined)
    patch.recommended_action = input.recommended_action;
  if (input.caveats !== undefined) patch.caveats = input.caveats;
  if (input.rejection_reason !== undefined)
    patch.rejection_reason = input.rejection_reason;

  const { data, error } = await supabase
    .from("recommendations")
    .update(patch)
    .eq("id", input.id)
    .select("*")
    .single();
  if (error) throw new Error(`updateRecommendation: ${error.message}`);
  return data as Recommendation;
}
