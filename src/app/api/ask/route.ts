import { NextResponse } from "next/server";
import { ask } from "@/lib/rag/pipeline";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      question?: string;
      projectId?: string;
    };

    if (!body.question || typeof body.question !== "string") {
      return NextResponse.json(
        { error: "question is required" },
        { status: 400 },
      );
    }
    if (!body.projectId || typeof body.projectId !== "string") {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 },
      );
    }

    const result = await ask(body.question, body.projectId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
