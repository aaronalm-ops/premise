import { NextResponse } from "next/server";
import { listProjects, createProject } from "@/lib/db/projects";
import { CreateProjectBody } from "@/lib/validation/schemas";
import { safeError } from "@/lib/api/safe-error";
import { requireUser } from "@/lib/auth/server";

export async function GET() {
  try {
    const user = await requireUser();
    const projects = await listProjects(user.id);
    return NextResponse.json({ projects });
  } catch (err) {
    return safeError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = CreateProjectBody.parse(await req.json());
    const project = await createProject({
      ownerId: user.id,
      name: body.name,
      description: body.description ?? null,
      confidentiality: body.confidentiality ?? "client-confidential",
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    return safeError(err);
  }
}
