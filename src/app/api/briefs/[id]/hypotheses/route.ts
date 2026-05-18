import { NextResponse } from "next/server";
import { getBrief } from "@/lib/db/briefs";
import { generateHypotheses } from "@/lib/rag/hypothesis-generator";
import { replaceProposedHypotheses } from "@/lib/db/hypotheses";
import { IdParam } from "@/lib/validation/schemas";
import { HttpError, safeError } from "@/lib/api/safe-error";
import { withGenerationLock } from "@/lib/api/with-lock";
import { assertBriefAccess, requireUser } from "@/lib/auth/server";

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

    // D-049: if the clarifier flagged axes that still need researcher input,
    // refuse to generate. The UI calls /scope/detect first, surfaces a
    // clarifier card, and only POSTs here once scope_clarifier_status is
    // 'answered', 'skipped', or 'not_required'. We accept null too so older
    // briefs (pre-D-049) generate without a forced clarification.
    if (brief.scope_clarifier_status === "pending") {
      throw new HttpError(
        409,
        "Brief scope needs clarification before hypotheses can be generated. Resolve the open scope questions and retry.",
      );
    }

    return await withGenerationLock(`hypotheses:${id}`, async () => {
      const { drafts, retrieved_chunks } = await generateHypotheses({
        briefContent: brief.content,
        projectId: brief.project_id,
        briefId: brief.id,
        scopeDimensions: brief.scope_dimensions,
        scopeClarifications: brief.scope_clarifications,
      });

      if (drafts.length === 0) {
        throw new HttpError(
          422,
          "No hypotheses could be generated. The corpus has no chunks relevant to this brief, or all draft hypotheses lacked grounding citations.",
          { retrieved_chunks },
        );
      }

      const hypotheses = await replaceProposedHypotheses({
        briefId: brief.id,
        projectId: brief.project_id,
        drafts,
      });

      return NextResponse.json({ hypotheses, retrieved_chunks });
    });
  } catch (err) {
    return safeError(err);
  }
}
