import { NextResponse } from "next/server";
import { updateQuestionVariant } from "@/lib/db/questions";
import { getSupabaseServer } from "@/lib/db/supabase";
import {
  IdParam,
  UpdateQuestionVariantBody,
} from "@/lib/validation/schemas";
import { HttpError, safeError } from "@/lib/api/safe-error";
import { assertProjectAccess, requireUser } from "@/lib/auth/server";

async function assertVariantAccess(variantId: string, userId: string) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("question_variants")
    .select("question_id, questions!inner(project_id)")
    .eq("id", variantId)
    .maybeSingle();
  if (error) throw new HttpError(500, "Could not verify access.");
  if (!data) throw new HttpError(404, "Variant not found.");
  const projectId = (data as unknown as { questions: { project_id: string } })
    .questions.project_id;
  await assertProjectAccess(projectId, userId);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = IdParam.parse(await params);
    await assertVariantAccess(id, user.id);
    const body = UpdateQuestionVariantBody.parse(await req.json());
    const variant = await updateQuestionVariant({
      id,
      statement: body.statement,
      response_format: body.response_format,
      response_options: body.response_options,
    });
    return NextResponse.json({ variant });
  } catch (err) {
    return safeError(err);
  }
}
