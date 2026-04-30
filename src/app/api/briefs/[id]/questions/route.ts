import { NextResponse } from "next/server";
import { getBrief } from "@/lib/db/briefs";
import { listHypotheses } from "@/lib/db/hypotheses";
import { listPersonas } from "@/lib/db/personas";
import {
  listQuestionsWithVariants,
  replaceProposedQuestions,
} from "@/lib/db/questions";
import { generateQuestions } from "@/lib/rag/question-generator";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const questions = await listQuestionsWithVariants(id);
    return NextResponse.json({ questions });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const brief = await getBrief(id);
    if (!brief) {
      return NextResponse.json({ error: "brief not found" }, { status: 404 });
    }

    const hypotheses = await listHypotheses(id);
    const acceptedHypotheses = hypotheses.filter(
      (h) => h.status === "accepted",
    );
    if (acceptedHypotheses.length === 0) {
      return NextResponse.json(
        {
          error:
            "Accept at least one hypothesis before generating questions. Premise needs something concrete to build the questionnaire around.",
        },
        { status: 422 },
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
      return NextResponse.json(
        {
          error:
            "No questions were produced. The model returned an empty or malformed list.",
        },
        { status: 422 },
      );
    }

    const questions = await replaceProposedQuestions({
      briefId: brief.id,
      projectId: brief.project_id,
      drafts,
    });

    return NextResponse.json({ questions });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
