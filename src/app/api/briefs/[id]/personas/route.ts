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
import { assertBriefAccess, requireUser } from "@/lib/auth/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = IdParam.parse(await params);
    await assertBriefAccess(id, user.id);
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
    const user = await requireUser();
    const { id } = IdParam.parse(await params);
    await assertBriefAccess(id, user.id);
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
          "The persona generator produced no drafts. This is usually a transient model error — try again. If it keeps happening, the brief may be too short to suggest meaningful audience archetypes.",
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
