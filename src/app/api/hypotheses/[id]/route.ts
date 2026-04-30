import { NextResponse } from "next/server";
import { updateHypothesis } from "@/lib/db/hypotheses";
import type { HypothesisStatus } from "@/lib/rag/types";

const VALID_STATUSES: HypothesisStatus[] = [
  "proposed",
  "accepted",
  "rejected",
];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as {
      status?: string;
      notes?: string | null;
    };

    if (
      body.status !== undefined &&
      !VALID_STATUSES.includes(body.status as HypothesisStatus)
    ) {
      return NextResponse.json(
        {
          error: `status must be one of: ${VALID_STATUSES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const hypothesis = await updateHypothesis({
      id,
      status: body.status as HypothesisStatus | undefined,
      notes: body.notes,
    });
    return NextResponse.json({ hypothesis });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
