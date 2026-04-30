import { NextResponse } from "next/server";
import { getBrief, updateBrief } from "@/lib/db/briefs";
import { listHypotheses } from "@/lib/db/hypotheses";
import { IdParam, UpdateBriefBody } from "@/lib/validation/schemas";
import { HttpError, safeError } from "@/lib/api/safe-error";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = IdParam.parse(await params);
    const brief = await getBrief(id);
    if (!brief) throw new HttpError(404, "Brief not found.");
    const hypotheses = await listHypotheses(id);
    return NextResponse.json({ brief, hypotheses });
  } catch (err) {
    return safeError(err);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = IdParam.parse(await params);
    const body = UpdateBriefBody.parse(await req.json());
    const brief = await updateBrief({
      id,
      title: body.title,
      content: body.content,
    });
    return NextResponse.json({ brief });
  } catch (err) {
    return safeError(err);
  }
}
