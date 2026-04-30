import { NextResponse } from "next/server";
import { updateQuestion } from "@/lib/db/questions";
import { IdParam, UpdateQuestionBody } from "@/lib/validation/schemas";
import { safeError } from "@/lib/api/safe-error";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = IdParam.parse(await params);
    const body = UpdateQuestionBody.parse(await req.json());
    const question = await updateQuestion({
      id,
      selected_variant_id: body.selected_variant_id,
      status: body.status,
      notes: body.notes,
      target_construct: body.target_construct,
      rationale: body.rationale,
    });
    return NextResponse.json({ question });
  } catch (err) {
    return safeError(err);
  }
}
