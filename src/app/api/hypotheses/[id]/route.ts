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
      statement?: string;
      expected_direction?: string | null;
      confirmation_criteria?: string | null;
      assumptions?: string[];
      priority?: number;
    };

    if (
      body.status !== undefined &&
      !VALID_STATUSES.includes(body.status as HypothesisStatus)
    ) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 },
      );
    }

    if (
      body.priority !== undefined &&
      (!Number.isInteger(body.priority) ||
        body.priority < 1 ||
        body.priority > 5)
    ) {
      return NextResponse.json(
        { error: "priority must be an integer between 1 and 5" },
        { status: 400 },
      );
    }

    const hypothesis = await updateHypothesis({
      id,
      status: body.status as HypothesisStatus | undefined,
      notes: body.notes,
      statement: body.statement,
      expected_direction: body.expected_direction,
      confirmation_criteria: body.confirmation_criteria,
      assumptions: body.assumptions,
      priority: body.priority as 1 | 2 | 3 | 4 | 5 | undefined,
    });
    return NextResponse.json({ hypothesis });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
