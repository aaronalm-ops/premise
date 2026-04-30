import { NextResponse } from "next/server";
import { updateQuestion } from "@/lib/db/questions";
import type { HypothesisStatus } from "@/lib/rag/types";

const VALID: HypothesisStatus[] = ["proposed", "accepted", "rejected"];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as {
      selected_variant_id?: string | null;
      status?: string;
      notes?: string | null;
      target_construct?: string;
      rationale?: string | null;
    };

    if (
      body.status !== undefined &&
      !VALID.includes(body.status as HypothesisStatus)
    ) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID.join(", ")}` },
        { status: 400 },
      );
    }

    const question = await updateQuestion({
      id,
      selected_variant_id: body.selected_variant_id,
      status: body.status as HypothesisStatus | undefined,
      notes: body.notes,
      target_construct: body.target_construct,
      rationale: body.rationale,
    });
    return NextResponse.json({ question });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
