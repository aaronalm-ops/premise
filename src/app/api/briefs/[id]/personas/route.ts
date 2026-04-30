import { NextResponse } from "next/server";
import { getBrief } from "@/lib/db/briefs";
import { listHypotheses } from "@/lib/db/hypotheses";
import { generatePersonas } from "@/lib/rag/persona-generator";
import {
  listPersonas,
  replaceProposedPersonas,
} from "@/lib/db/personas";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const personas = await listPersonas(id);
    return NextResponse.json({ personas });
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

    const allHypotheses = await listHypotheses(id);
    const accepted = allHypotheses.filter((h) => h.status === "accepted");

    const { drafts, retrieved_chunks } = await generatePersonas({
      briefContent: brief.content,
      projectId: brief.project_id,
      acceptedHypotheses: accepted,
      briefId: brief.id,
    });

    if (drafts.length === 0) {
      return NextResponse.json(
        {
          error:
            "No personas could be generated. The corpus has no chunks relevant to this brief, or all draft personas lacked grounding citations.",
          retrieved_chunks,
        },
        { status: 422 },
      );
    }

    const personas = await replaceProposedPersonas({
      briefId: brief.id,
      projectId: brief.project_id,
      drafts,
    });

    return NextResponse.json({ personas, retrieved_chunks });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
