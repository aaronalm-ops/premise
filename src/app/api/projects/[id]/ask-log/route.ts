import { NextResponse } from "next/server";
import { listRecentAsks } from "@/lib/db/ask-log";
import { IdParam } from "@/lib/validation/schemas";
import { safeError } from "@/lib/api/safe-error";
import { assertProjectAccess, requireUser } from "@/lib/auth/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = IdParam.parse(await params);
    await assertProjectAccess(id, user.id);
    const entries = await listRecentAsks(id, 30);
    return NextResponse.json({ entries });
  } catch (err) {
    return safeError(err);
  }
}
