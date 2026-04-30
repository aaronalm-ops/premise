import { NextResponse } from "next/server";
import { getProjectCostRollup } from "@/lib/db/costs";
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
    const rollup = await getProjectCostRollup(id);
    return NextResponse.json(rollup);
  } catch (err) {
    return safeError(err);
  }
}
