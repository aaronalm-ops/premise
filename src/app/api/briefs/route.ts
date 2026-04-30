import { NextResponse } from "next/server";
import { listBriefs, createBrief } from "@/lib/db/briefs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json(
        { error: "projectId query param is required" },
        { status: 400 },
      );
    }
    const briefs = await listBriefs(projectId);
    return NextResponse.json({ briefs });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      projectId?: string;
      title?: string | null;
      content?: string;
    };
    if (!body.projectId || typeof body.projectId !== "string") {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 },
      );
    }
    if (!body.content || typeof body.content !== "string") {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 },
      );
    }
    const brief = await createBrief({
      projectId: body.projectId,
      title: body.title ?? null,
      content: body.content,
    });
    return NextResponse.json({ brief }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
