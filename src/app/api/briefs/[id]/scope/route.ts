// D-049: GET returns the brief's current scope state (detected dimensions +
// any clarifications + status). PATCH saves the researcher's clarifier
// answers and flips the status.
//
// The actual detection runs in /scope/detect (a separate POST) so this route
// stays cheap and side-effect-free for read.

import { NextResponse } from "next/server";
import { getBrief, updateBrief } from "@/lib/db/briefs";
import {
  IdParam,
  UpdateBriefScopeBody,
} from "@/lib/validation/schemas";
import { HttpError, safeError } from "@/lib/api/safe-error";
import { assertBriefAccess, requireUser } from "@/lib/auth/server";
import {
  SCOPE_AXES,
  type Brief,
  type ScopeAxis,
} from "@/lib/rag/types";

function deriveNudgeAxes(brief: Brief): ScopeAxis[] {
  if (!brief.scope_dimensions || !brief.scope_corpus_skew) return [];
  const clar = brief.scope_clarifications ?? {};
  return SCOPE_AXES.filter(
    (axis) =>
      brief.scope_dimensions![axis].specified === false &&
      brief.scope_corpus_skew![axis] !== undefined &&
      clar[axis] === undefined,
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = IdParam.parse(await params);
    await assertBriefAccess(id, user.id);
    const brief = await getBrief(id);
    if (!brief) throw new HttpError(404, "Brief not found.");
    return NextResponse.json({
      dimensions: brief.scope_dimensions,
      skew: brief.scope_corpus_skew,
      clarifications: brief.scope_clarifications,
      status: brief.scope_clarifier_status,
      nudge_axes: deriveNudgeAxes(brief),
    });
  } catch (err) {
    return safeError(err);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = IdParam.parse(await params);
    await assertBriefAccess(id, user.id);
    const body = UpdateBriefScopeBody.parse(await req.json());

    const brief = await updateBrief({
      id,
      scope_clarifications: body.clarifications ?? undefined,
      scope_clarifier_status: body.status ?? undefined,
    });

    return NextResponse.json({
      dimensions: brief.scope_dimensions,
      skew: brief.scope_corpus_skew,
      clarifications: brief.scope_clarifications,
      status: brief.scope_clarifier_status,
      nudge_axes: deriveNudgeAxes(brief),
    });
  } catch (err) {
    return safeError(err);
  }
}
