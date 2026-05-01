import { NextResponse } from "next/server";
import { listStoryAngles } from "@/lib/db/stories";
import { IdParam } from "@/lib/validation/schemas";
import { safeError } from "@/lib/api/safe-error";
import { assertBriefAccess, requireUser } from "@/lib/auth/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = IdParam.parse(await params);
    await assertBriefAccess(id, user.id);
    const angles = await listStoryAngles(id);
    return NextResponse.json({ angles });
  } catch (err) {
    return safeError(err);
  }
}
