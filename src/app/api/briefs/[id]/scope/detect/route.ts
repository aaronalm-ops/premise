// D-049: runs the brief-scope detection (Haiku on brief alone) + project-
// corpus skew check, computes which axes need a researcher clarification,
// and persists the result on the brief. Returns the same shape as GET
// /scope plus a `nudge_axes` list the UI uses to render the clarifier.
//
// Idempotent: re-running on the same brief replaces the detection. The
// researcher's existing clarifications are preserved if they've already
// resolved an axis that still needs nudging — they don't get asked twice.

import { NextResponse } from "next/server";
import { getBrief, updateBrief } from "@/lib/db/briefs";
import { IdParam } from "@/lib/validation/schemas";
import { HttpError, safeError } from "@/lib/api/safe-error";
import { assertBriefAccess, requireUser } from "@/lib/auth/server";
import { detectScopeDimensions } from "@/lib/rag/scope-detector";
import { detectCorpusSkew } from "@/lib/rag/corpus-skew";
import {
  SCOPE_AXES,
  type ScopeAxis,
  type ScopeClarifications,
  type ScopeClarifierStatus,
} from "@/lib/rag/types";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = IdParam.parse(await params);
    await assertBriefAccess(id, user.id);
    const brief = await getBrief(id);
    if (!brief) throw new HttpError(404, "Brief not found.");

    const [dimensions, skew] = await Promise.all([
      detectScopeDimensions({
        briefContent: brief.content,
        projectId: brief.project_id,
        briefId: brief.id,
      }),
      detectCorpusSkew({
        projectId: brief.project_id,
        briefId: brief.id,
      }),
    ]);

    // An axis is "nudgeable" when the brief is silent AND the project corpus
    // skews on it. Public-library skew is deliberately not surfaced (see
    // corpus-skew.ts header).
    const nudgeAxes: ScopeAxis[] = SCOPE_AXES.filter(
      (axis) => !dimensions[axis].specified && skew[axis] !== undefined,
    );

    const existing = (brief.scope_clarifications ?? {}) as ScopeClarifications;
    const unresolved = nudgeAxes.filter((axis) => existing[axis] === undefined);

    const status: ScopeClarifierStatus =
      unresolved.length === 0 ? "not_required" : "pending";

    const updated = await updateBrief({
      id,
      scope_dimensions: dimensions,
      scope_corpus_skew: skew,
      scope_clarifier_status: status,
    });

    return NextResponse.json({
      dimensions: updated.scope_dimensions,
      skew: updated.scope_corpus_skew,
      clarifications: updated.scope_clarifications,
      status: updated.scope_clarifier_status,
      nudge_axes: unresolved,
    });
  } catch (err) {
    return safeError(err);
  }
}
