import { NextResponse } from "next/server";
import { updateQuestionVariant } from "@/lib/db/questions";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as {
      statement?: string;
      response_format?: string | null;
      response_options?: string[];
    };
    const variant = await updateQuestionVariant({
      id,
      statement: body.statement,
      response_format: body.response_format,
      response_options: body.response_options,
    });
    return NextResponse.json({ variant });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
