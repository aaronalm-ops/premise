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
//
// Atomic via a Postgres function (D-026): if the insert fails, the prior
// delete is rolled back and the user keeps their existing proposed rows.
export async function replaceProposedHypotheses(input: {
  briefId: string;
  projectId: string;
  drafts: HypothesisDraft[];
}): Promise<Hypothesis[]> {
  const supabase = getSupabaseServer();

  if (input.drafts.length === 0) {
    await supabase
      .from("hypotheses")
      .delete()
      .eq("brief_id", input.briefId)
      .eq("status", "proposed");
    return [];
  }

  const sorted = [...input.drafts].sort((a, b) => b.priority - a.priority);

  const { error: rpcErr } = await supabase.rpc("replace_proposed_hypotheses", {
    p_brief_id: input.briefId,
    p_project_id: input.projectId,
    p_drafts: sorted,
  });
  if (rpcErr)
    throw new Error(`replaceProposedHypotheses: ${rpcErr.message}`);

  return listHypotheses(input.briefId).then((all) =>
    all.filter((h) => h.status === "proposed"),
  );
}

export async function updateHypothesis(input: {
  id: string;
  status?: HypothesisStatus;
  notes?: string | null;
  statement?: string;
  expected_direction?: string | null;
  confirmation_criteria?: string | null;
  assumptions?: string[];
  priority?: 1 | 2 | 3 | 4 | 5;
  rejection_reason?: string | null;
}): Promise<Hypothesis> {
  const supabase = getSupabaseServer();
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.status !== undefined) patch.status = input.status;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.rejection_reason !== undefined)
    patch.rejection_reason = input.rejection_reason;
  if (input.statement !== undefined) patch.statement = input.statement;
  if (input.expected_direction !== undefined)
    patch.expected_direction = input.expected_direction;
  if (input.confirmation_criteria !== undefined)
    patch.confirmation_criteria = input.confirmation_criteria;
  if (input.assumptions !== undefined) patch.assumptions = input.assumptions;
  if (input.priority !== undefined) patch.priority = input.priority;

  const { data, error } = await supabase
    .from("hypotheses")
    .update(patch)
    .eq("id", input.id)
    .select("*")
    .single();
  if (error) throw new Error(`updateHypothesis: ${error.message}`);
  return data as Hypothesis;
}
