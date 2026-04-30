import { NextResponse } from "next/server";
import { getBrief } from "@/lib/db/briefs";
import { generateHypotheses } from "@/lib/rag/hypothesis-generator";
import { replaceProposedHypotheses } from "@/lib/db/hypotheses";
import { IdParam } from "@/lib/validation/schemas";
import { HttpError, safeError } from "@/lib/api/safe-error";
import { withGenerationLock } from "@/lib/api/with-lock";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = IdParam.parse(await params);
    const brief = await getBrief(id);
    if (!brief) throw new HttpError(404, "Brief not found.");

    return await withGenerationLock(`hypotheses:${id}`, async () => {
      const { drafts, retrieved_chunks } = await generateHypotheses({
        briefContent: brief.content,
        projectId: brief.project_id,
        briefId: brief.id,
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
