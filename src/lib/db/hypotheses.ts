import { getSupabaseServer } from "@/lib/db/supabase";
import type {
  Hypothesis,
  HypothesisDraft,
  HypothesisStatus,
} from "@/lib/rag/types";

export async function listHypotheses(briefId: string): Promise<Hypothesis[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("hypotheses")
    .select("*")
    .eq("brief_id", briefId)
    .order("ordinal", { ascending: true });
  if (error) throw new Error(`listHypotheses: ${error.message}`);
  return (data ?? []) as Hypothesis[];
}

// Replaces all proposed hypotheses for a brief. Accepted/rejected are kept,
// preserving the researcher's prior decisions even when they regenerate.
export async function replaceProposedHypotheses(input: {
  briefId: string;
  projectId: string;
  drafts: HypothesisDraft[];
}): Promise<Hypothesis[]> {
  const supabase = getSupabaseServer();

  await supabase
    .from("hypotheses")
    .delete()
    .eq("brief_id", input.briefId)
    .eq("status", "proposed");

  const { data: existing } = await supabase
    .from("hypotheses")
    .select("ordinal")
    .eq("brief_id", input.briefId)
    .order("ordinal", { ascending: false })
    .limit(1);

  const startOrdinal = (existing?.[0]?.ordinal ?? -1) + 1;

  if (input.drafts.length === 0) return [];

  const sorted = [...input.drafts].sort((a, b) => b.priority - a.priority);

  const rows = sorted.map((d, i) => ({
    brief_id: input.briefId,
    project_id: input.projectId,
    ordinal: startOrdinal + i,
    statement: d.statement,
    assumptions: d.assumptions,
    expected_direction: d.expected_direction,
    confirmation_criteria: d.confirmation_criteria,
    supporting_chunk_ids: d.supporting_chunk_ids,
    contradicting_chunk_ids: d.contradicting_chunk_ids,
    priority: d.priority,
    status: "proposed" as const,
  }));

  const { data, error } = await supabase
    .from("hypotheses")
    .insert(rows)
    .select("*");
  if (error) throw new Error(`replaceProposedHypotheses: ${error.message}`);

  return (data ?? []) as Hypothesis[];
}

export async function updateHypothesis(input: {
  id: string;
  status?: HypothesisStatus;
  notes?: string | null;
}): Promise<Hypothesis> {
  const supabase = getSupabaseServer();
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.status !== undefined) patch.status = input.status;
  if (input.notes !== undefined) patch.notes = input.notes;

  const { data, error } = await supabase
    .from("hypotheses")
    .update(patch)
    .eq("id", input.id)
    .select("*")
    .single();
  if (error) throw new Error(`updateHypothesis: ${error.message}`);
  return data as Hypothesis;
}
