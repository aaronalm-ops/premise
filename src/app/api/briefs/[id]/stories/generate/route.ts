import { NextResponse } from "next/server";
import { getBrief } from "@/lib/db/briefs";
import { listHypotheses } from "@/lib/db/hypotheses";
import { listPersonas } from "@/lib/db/personas";
import { getAnalysisWithData } from "@/lib/db/analysis";
import { generateStoryAngles } from "@/lib/rag/story-generator";
import { replaceProposedStoryAngles } from "@/lib/db/stories";
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
    const { id: briefId } = IdParam.parse(await params);
    await assertBriefAccess(briefId, user.id);

    const brief = await getBrief(briefId);
    if (!brief) throw new HttpError(404, "Brief not found.");

    return await withGenerationLock(`stories:${briefId}`, async () => {
      const allHypotheses = await listHypotheses(briefId);
      const acceptedHypotheses = allHypotheses.filter(
        (h) => h.status === "accepted",
      );
      if (acceptedHypotheses.length === 0) {
        throw new HttpError(
          422,
          "Accept at least one hypothesis before generating story angles.",
        );
      }

      const allPersonas = await listPersonas(briefId);
      const acceptedPersonas = allPersonas.filter((p) => p.status === "accepted");

      const analysisRow = await getAnalysisWithData(briefId);
      const analysis =
        analysisRow && analysisRow.status === "complete" ? analysisRow : null;

      const { drafts } = await generateStoryAngles({
        briefContent: brief.content,
        acceptedHypotheses,
        acceptedPersonas,
        analysis,
        projectId: brief.project_id,
        briefId,
      });

      if (drafts.length === 0) {
        throw new HttpError(
          422,
          "No grounded story angles were produced. Check that your hypotheses + analysis carry enough evidence.",
        );
      }

      const angles = await replaceProposedStoryAngles({
        briefId,
        projectId: brief.project_id,
        drafts,
      });
      return NextResponse.json({ angles });
    });
  } catch (err) {
    return safeError(err);
  }
}
