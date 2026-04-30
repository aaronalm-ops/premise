import { NextResponse } from "next/server";
import { listProjects, createProject } from "@/lib/db/projects";
import type { Confidentiality } from "@/lib/rag/types";

export async function GET() {
  try {
    const projects = await listProjects();
    return NextResponse.json({ projects });
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
      name?: string;
      description?: string | null;
      confidentiality?: Confidentiality;
    };

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 },
      );
    }

    const project = await createProject({
      name: body.name,
      description: body.description ?? null,
      confidentiality: body.confidentiality ?? "client-confidential",
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
