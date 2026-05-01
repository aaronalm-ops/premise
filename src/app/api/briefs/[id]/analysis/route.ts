import { NextResponse } from "next/server";
import { getAnalysisWithData } from "@/lib/db/analysis";
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
    const analysis = await getAnalysisWithData(id);
    return NextResponse.json({ analysis });
  } catch (err) {
    return safeError(err);
  }
}
