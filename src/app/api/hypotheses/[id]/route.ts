import { NextResponse } from "next/server";
import { updateHypothesis } from "@/lib/db/hypotheses";
import { getSupabaseServer } from "@/lib/db/supabase";
import { IdParam, UpdateHypothesisBody } from "@/lib/validation/schemas";
import { HttpError, safeError } from "@/lib/api/safe-error";
import { assertProjectAccess, requireUser } from "@/lib/auth/server";

async function assertHypothesisAccess(hypothesisId: string, userId: string) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("hypotheses")
    .select("project_id")
    .eq("id", hypothesisId)
    .maybeSingle();
  if (error) throw new HttpError(500, "Could not verify access.");
  if (!data) throw new HttpError(404, "Hypothesis not found.");
  await assertProjectAccess(data.project_id as string, userId);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = IdParam.parse(await params);
    await assertHypothesisAccess(id, user.id);
    const body = UpdateHypothesisBody.parse(await req.json());
    const hypothesis = await updateHypothesis({
      id,
      status: body.status,
      notes: body.notes,
      rejection_reason: body.rejection_reason,
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
