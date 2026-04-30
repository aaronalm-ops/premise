import { NextResponse } from "next/server";
import { getProjectCostRollup } from "@/lib/db/costs";
import { IdParam } from "@/lib/validation/schemas";
import { safeError } from "@/lib/api/safe-error";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = IdParam.parse(await params);
    const rollup = await getProjectCostRollup(id);
    return NextResponse.json(rollup);
  } catch (err) {
    return safeError(err);
  }
}
