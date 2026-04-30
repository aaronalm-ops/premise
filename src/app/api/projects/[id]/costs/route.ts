import { NextResponse } from "next/server";
import { getProjectCostRollup } from "@/lib/db/costs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const rollup = await getProjectCostRollup(id);
    return NextResponse.json(rollup);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
