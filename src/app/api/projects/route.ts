import { NextResponse } from "next/server";
import { listProjects, createProject } from "@/lib/db/projects";
import { CreateProjectBody } from "@/lib/validation/schemas";
import { safeError } from "@/lib/api/safe-error";

export async function GET() {
  try {
    const projects = await listProjects();
    return NextResponse.json({ projects });
  } catch (err) {
    return safeError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = CreateProjectBody.parse(await req.json());
    const project = await createProject({
      name: body.name,
      description: body.description ?? null,
      confidentiality: body.confidentiality ?? "client-confidential",
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    return safeError(err);
  }
}
