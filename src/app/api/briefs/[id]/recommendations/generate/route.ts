import { NextResponse } from "next/server";
import { getBrief } from "@/lib/db/briefs";
import { listHypotheses } from "@/lib/db/hypotheses";
import { listPersonas } from "@/lib/db/personas";
import { getAnalysisWithData } from "@/lib/db/analysis";
import { generateRecommendations } from "@/lib/rag/recommendation-generator";
import { replaceProposedRecommendations } from "@/lib/db/recommendations";
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

    return await withGenerationLock(`recommendations:${briefId}`, async () => {
      const allHypotheses = await listHypotheses(briefId);
      const acceptedHypotheses = allHypotheses.filter(
        (h) => h.status === "accepted",
      );
      if (acceptedHypotheses.length === 0) {
        throw new HttpError(
          422,
          "Accept at least one hypothesis before generating recommendations.",
        );
      }

      const allPersonas = await listPersonas(briefId);
      const acceptedPersonas = allPersonas.filter(
        (p) => p.status === "accepted",
      );

      const analysisRow = await getAnalysisWithData(briefId);
      const analysis =
        analysisRow && analysisRow.status === "complete" ? analysisRow : null;

      const { drafts } = await generateRecommendations({
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
          "The evidence chain is too thin to ground a causal recommendation. Run the analysis stage, accept stronger hypotheses, or upload more data sources.",
        );
      }

      const recommendations = await replaceProposedRecommendations({
        briefId,
        projectId: brief.project_id,
        drafts,
      });
      return NextResponse.json({ recommendations });
    });
  } catch (err) {
    return safeError(err);
  }
}
