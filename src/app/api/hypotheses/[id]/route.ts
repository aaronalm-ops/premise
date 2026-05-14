import { NextResponse } from "next/server";
import {
  bodyMutatesStructuralFields,
  briefHasAnalysis,
  getHypothesis,
  updateHypothesis,
} from "@/lib/db/hypotheses";
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

    // D-041: post-analysis revision discipline. If the hypothesis is
    // accepted AND an analysis exists on its brief AND the body changes a
    // structural field (not just status / notes / rejection_reason), the
    // request MUST carry a non-empty revision_rationale. This is the
    // pre-registration / deviation-report pattern — we don't lock the row,
    // we require an audit trail on the deviation. The taskforce (9a + 4)
    // converged on this answer.
    const current = await getHypothesis(id);
    if (!current) throw new HttpError(404, "Hypothesis not found.");

    const structural = bodyMutatesStructuralFields(body);
    let revisedAfterAnalysis: boolean | undefined;
    let revisionRationale: string | null | undefined;

    if (structural && current.status === "accepted") {
      const analysisExists = await briefHasAnalysis(current.brief_id);
      if (analysisExists) {
        if (!body.revision_rationale || body.revision_rationale.trim().length === 0) {
          throw new HttpError(
            422,
            "An analysis already exists for this brief. To revise an accepted hypothesis post-analysis, include a non-empty `revision_rationale` naming why the revision is necessary. The rationale will be surfaced on the hypothesis card and auto-appended to any story angle that leans on it.",
          );
        }
        revisedAfterAnalysis = true;
        revisionRationale = body.revision_rationale;
      }
    }

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
      revised_after_analysis: revisedAfterAnalysis,
      revision_rationale: revisionRationale,
    });
    return NextResponse.json({ hypothesis });
  } catch (err) {
    return safeError(err);
  }
}
