import { NextResponse } from "next/server";
import { listBriefs, createBrief } from "@/lib/db/briefs";
import { CreateBriefBody } from "@/lib/validation/schemas";
import { safeError, HttpError } from "@/lib/api/safe-error";
import { z } from "zod";

const ListQuery = z.object({ projectId: z.string().uuid() });

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const { projectId } = ListQuery.parse({
      projectId: url.searchParams.get("projectId") ?? undefined,
    });
    const briefs = await listBriefs(projectId);
    return NextResponse.json({ briefs });
  } catch (err) {
    return safeError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = CreateBriefBody.parse(await req.json());
    const brief = await createBrief({
      projectId: body.projectId,
      title: body.title ?? null,
      content: body.content,
    });
    return NextResponse.json({ brief }, { status: 201 });
  } catch (err) {
    return safeError(err);
  }
}
