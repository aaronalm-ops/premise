import { NextResponse } from "next/server";
import { updateQuestionVariant } from "@/lib/db/questions";
import {
  IdParam,
  UpdateQuestionVariantBody,
} from "@/lib/validation/schemas";
import { safeError } from "@/lib/api/safe-error";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = IdParam.parse(await params);
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
