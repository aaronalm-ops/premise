import { NextResponse } from "next/server";
import { updateHypothesis } from "@/lib/db/hypotheses";
import { IdParam, UpdateHypothesisBody } from "@/lib/validation/schemas";
import { safeError } from "@/lib/api/safe-error";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = IdParam.parse(await params);
    const body = UpdateHypothesisBody.parse(await req.json());
    const hypothesis = await updateHypothesis({
      id,
      status: body.status,
      notes: body.notes,
      statement: body.statement,
      expected_direction: body.expected_direction,
      confirmation_criteria: body.confirmation_criteria,
      assumptions: body.assumptions,
      priority: body.priority as 1 | 2 | 3 | 4 | 5 | undefined,
    });
    return NextResponse.json({ hypothesis });
  } catch (err) {
    return safeError(err);
  }
}
