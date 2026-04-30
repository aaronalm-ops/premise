import { NextResponse } from "next/server";
import { ask } from "@/lib/rag/pipeline";
import { AskBody } from "@/lib/validation/schemas";
import { safeError } from "@/lib/api/safe-error";

export async function POST(req: Request) {
  try {
    const body = AskBody.parse(await req.json());
    const result = await ask(body.question, body.projectId);
    return NextResponse.json(result);
  } catch (err) {
    return safeError(err);
  }
}
