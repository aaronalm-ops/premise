import { NextResponse } from "next/server";
import {
  getAnalysisWithData,
  getOrCreateAnalysis,
  persistAnalysisResult,
  setAnalysisFailed,
  setAnalysisRunning,
} from "@/lib/db/analysis";
import { getBrief } from "@/lib/db/briefs";
import { listHypotheses } from "@/lib/db/hypotheses";
import { listPersonas } from "@/lib/db/personas";
import { listQuestionsWithVariants } from "@/lib/db/questions";
import { generateAnalysis } from "@/lib/rag/analysis-generator";
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

    return await withGenerationLock(`analysis:${briefId}`, async () => {
      const analysis = await getOrCreateAnalysis(briefId, brief.project_id);
      const fresh = await getAnalysisWithData(briefId);
      if (!fresh) throw new HttpError(500, "Analysis not found after create.");

      if (fresh.data.length === 0) {
        throw new HttpError(
          422,
          "Upload at least one data source (CSV / transcript / paste) before running analysis.",
        );
      }

      const allHypotheses = await listHypotheses(briefId);
      const acceptedHypotheses = allHypotheses.filter(
        (h) => h.status === "accepted",
      );
      if (acceptedHypotheses.length === 0) {
        throw new HttpError(
          422,
          "Accept at least one hypothesis before running analysis. Without hypotheses Premise has nothing to verdict against.",
        );
      }

      const personas = await listPersonas(briefId);
      const acceptedPersonas = personas.filter((p) => p.status === "accepted");
      const questions = await listQuestionsWithVariants(briefId);

      await setAnalysisRunning(analysis.id);

      try {
        const result = await generateAnalysis({
          briefContent: brief.content,
          acceptedHypotheses,
          acceptedPersonas,
          questions,
          data: fresh.data,
          projectId: brief.project_id,
          briefId,
        });

        const persisted = await persistAnalysisResult({
          analysisId: analysis.id,
          result,
        });

        return NextResponse.json({ analysis: persisted, data: fresh.data });
      } catch (err) {
        await setAnalysisFailed(analysis.id, (err as Error).message);
        throw err;
      }
    });
  } catch (err) {
    return safeError(err);
  }
}
