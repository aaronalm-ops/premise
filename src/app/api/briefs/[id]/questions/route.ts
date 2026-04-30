import { NextResponse } from "next/server";
import { getBrief } from "@/lib/db/briefs";
import { listHypotheses } from "@/lib/db/hypotheses";
import { listPersonas } from "@/lib/db/personas";
import {
  listQuestionsWithVariants,
  replaceProposedQuestions,
} from "@/lib/db/questions";
import { generateQuestions } from "@/lib/rag/question-generator";
import { IdParam } from "@/lib/validation/schemas";
import { HttpError, safeError } from "@/lib/api/safe-error";
import { withGenerationLock } from "@/lib/api/with-lock";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = IdParam.parse(await params);
    const questions = await listQuestionsWithVariants(id);
    return NextResponse.json({ questions });
  } catch (err) {
    return safeError(err);
  }
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = IdParam.parse(await params);
    const brief = await getBrief(id);
    if (!brief) throw new HttpError(404, "Brief not found.");

    return await withGenerationLock(`questions:${id}`, async () => {
      const hypotheses = await listHypotheses(id);
      const acceptedHypotheses = hypotheses.filter(
        (h) => h.status === "accepted",
      );
      if (acceptedHypotheses.length === 0) {
        throw new HttpError(
          422,
          "Accept at least one hypothesis before generating questions. Premise needs something concrete to build the questionnaire around.",
        );
      }

      const personas = await listPersonas(id);
      const acceptedPersonas = personas.filter((p) => p.status === "accepted");

      const { drafts } = await generateQuestions({
        briefContent: brief.content,
        acceptedHypotheses,
        acceptedPersonas,
        projectId: brief.project_id,
        briefId: brief.id,
      });

      if (drafts.length === 0) {
        throw new HttpError(
          422,
          "No questions were produced. The model returned an empty or malformed list.",
        );
      }

      const questions = await replaceProposedQuestions({
        briefId: brief.id,
        projectId: brief.project_id,
        drafts,
      });

      return NextResponse.json({ questions });
    });
  } catch (err) {
    return safeError(err);
  }
}
