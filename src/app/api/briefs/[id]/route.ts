import { NextResponse } from "next/server";
import { getBrief, updateBrief } from "@/lib/db/briefs";
import { listHypotheses } from "@/lib/db/hypotheses";

export async function GET(
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
    return NextResponse.json({ brief, hypotheses });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as {
      title?: string | null;
      content?: string;
    };
    const brief = await updateBrief({
      id,
      title: body.title,
      content: body.content,
    });
    return NextResponse.json({ brief });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
