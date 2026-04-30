import { NextResponse } from "next/server";
import { updatePersona } from "@/lib/db/personas";
import type { HypothesisStatus } from "@/lib/rag/types";

const VALID: HypothesisStatus[] = ["proposed", "accepted", "rejected"];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as { status?: string };

    if (
      body.status !== undefined &&
      !VALID.includes(body.status as HypothesisStatus)
    ) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID.join(", ")}` },
        { status: 400 },
      );
    }

    const persona = await updatePersona({
      id,
      status: body.status as HypothesisStatus | undefined,
    });
    return NextResponse.json({ persona });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
