import { NextResponse } from "next/server";
import { getBrief } from "@/lib/db/briefs";
import { listHypotheses } from "@/lib/db/hypotheses";
import { generatePersonas } from "@/lib/rag/persona-generator";
import {
  listPersonas,
  replaceProposedPersonas,
} from "@/lib/db/personas";
import { IdParam } from "@/lib/validation/schemas";
import { HttpError, safeError } from "@/lib/api/safe-error";
import { withGenerationLock } from "@/lib/api/with-lock";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = IdParam.parse(await params);
    const personas = await listPersonas(id);
    return NextResponse.json({ personas });
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

    return await withGenerationLock(`personas:${id}`, async () => {
      const allHypotheses = await listHypotheses(id);
      const accepted = allHypotheses.filter((h) => h.status === "accepted");

      const { drafts, retrieved_chunks } = await generatePersonas({
        briefContent: brief.content,
        projectId: brief.project_id,
        acceptedHypotheses: accepted,
        briefId: brief.id,
      });

      if (drafts.length === 0) {
        throw new HttpError(
          422,
          "No personas could be generated. The corpus has no chunks relevant to this brief, or all draft personas lacked grounding citations.",
          { retrieved_chunks },
        );
      }

      const personas = await replaceProposedPersonas({
        briefId: brief.id,
        projectId: brief.project_id,
        drafts,
      });

      return NextResponse.json({ personas, retrieved_chunks });
    });
  } catch (err) {
    return safeError(err);
  }
}
