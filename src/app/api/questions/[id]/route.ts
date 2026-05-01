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
    return NextResponse.json({ question });
  } catch (err) {
    return safeError(err);
  }
}
