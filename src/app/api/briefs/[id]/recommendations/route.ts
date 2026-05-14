import { NextResponse } from "next/server";
import { listRecommendations } from "@/lib/db/recommendations";
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
    const recommendations = await listRecommendations(id);
    return NextResponse.json({ recommendations });
  } catch (err) {
    return safeError(err);
  }
}
