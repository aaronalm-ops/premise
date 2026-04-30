import { NextResponse } from "next/server";
import { ask } from "@/lib/rag/pipeline";
import { AskBody } from "@/lib/validation/schemas";
import { safeError } from "@/lib/api/safe-error";
import { assertProjectAccess, requireUser } from "@/lib/auth/server";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = AskBody.parse(await req.json());
    await assertProjectAccess(body.projectId, user.id);
    const result = await ask(body.question, body.projectId);
    return NextResponse.json(result);
  } catch (err) {
    return safeError(err);
  }
}
