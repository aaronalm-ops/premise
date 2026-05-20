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

      // D-055: drafts.length === 0 is now genuinely rare (the model would
      // have to refuse to produce any hypothesis, which the new prompt
      // explicitly forbids). When it does happen, it's a real generator
      // failure, not a missing-corpus issue — so the error message reflects
      // that rather than blaming the corpus.
      if (drafts.length === 0) {
        throw new HttpError(
          422,
          "The hypothesis generator produced no drafts. This is usually a transient model error — try again. If it keeps happening, the brief may be too short or too ambiguous for the model to propose hypotheses from.",
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
