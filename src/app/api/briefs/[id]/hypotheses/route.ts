import { NextResponse } from "next/server";
import { getBrief } from "@/lib/db/briefs";
import { generateHypotheses } from "@/lib/rag/hypothesis-generator";
import { replaceProposedHypotheses } from "@/lib/db/hypotheses";

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

    const { drafts, retrieved_chunks } = await generateHypotheses({
      briefContent: brief.content,
      projectId: brief.project_id,
    });

    if (drafts.length === 0) {
      return NextResponse.json(
        {
          error:
            "No hypotheses could be generated. The corpus has no chunks relevant to this brief, or all draft hypotheses lacked grounding citations.",
          retrieved_chunks,
        },
        { status: 422 },
      );
    }

    const hypotheses = await replaceProposedHypotheses({
      briefId: brief.id,
      projectId: brief.project_id,
      drafts,
    });

    return NextResponse.json({ hypotheses, retrieved_chunks });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
