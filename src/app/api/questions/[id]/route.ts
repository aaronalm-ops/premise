import { NextResponse } from "next/server";
import { updateQuestion } from "@/lib/db/questions";
import { getSupabaseServer } from "@/lib/db/supabase";
import { IdParam, UpdateQuestionBody } from "@/lib/validation/schemas";
import { HttpError, safeError } from "@/lib/api/safe-error";
import { assertProjectAccess, requireUser } from "@/lib/auth/server";

async function assertQuestionAccess(questionId: string, userId: string) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("questions")
    .select("project_id")
    .eq("id", questionId)
    .maybeSingle();
  if (error) throw new HttpError(500, "Could not verify access.");
  if (!data) throw new HttpError(404, "Question not found.");
  await assertProjectAccess(data.project_id as string, userId);
}

// D-040: when the user picks a variant, mark that variant's selection_mode
// as 'default' if it matched the recommended one, 'active' otherwise.
// Server-derived — the client doesn't pass selection_mode. This is the audit
// trail the Behavioral Scientist (taskforce 4a) asked for.
async function applySelectionMode(
  questionId: string,
  newSelectedVariantId: string | null,
): Promise<void> {
  const supabase = getSupabaseServer();

  // Clear selection_mode on all variants of this question (only one can be
  // chosen at a time; flipping selection should reset the audit flag).
  await supabase
    .from("question_variants")
    .update({ selection_mode: null })
    .eq("question_id", questionId);

  if (!newSelectedVariantId) return;

  const { data, error } = await supabase
    .from("question_variants")
    .select("is_recommended")
    .eq("id", newSelectedVariantId)
    .maybeSingle();
  if (error || !data) return; // best-effort — selection_mode is observability, not correctness

  const mode = data.is_recommended ? "default" : "active";
  await supabase
    .from("question_variants")
    .update({ selection_mode: mode })
    .eq("id", newSelectedVariantId);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = IdParam.parse(await params);
    await assertQuestionAccess(id, user.id);
    const body = UpdateQuestionBody.parse(await req.json());

    const question = await updateQuestion({
      id,
      selected_variant_id: body.selected_variant_id,
      status: body.status,
      notes: body.notes,
      rejection_reason: body.rejection_reason,
      target_construct: body.target_construct,
      rationale: body.rationale,
    });

    if (body.selected_variant_id !== undefined) {
      await applySelectionMode(id, body.selected_variant_id ?? null);
    }

    return NextResponse.json({ question });
  } catch (err) {
    return safeError(err);
  }
}
