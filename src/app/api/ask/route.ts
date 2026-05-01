import { NextResponse } from "next/server";
import { ask } from "@/lib/rag/pipeline";
import { AskBody } from "@/lib/validation/schemas";
import { safeError } from "@/lib/api/safe-error";
import { assertProjectAccess, requireUser } from "@/lib/auth/server";
import { appendAsk } from "@/lib/db/ask-log";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = AskBody.parse(await req.json());
    await assertProjectAccess(body.projectId, user.id);
    const start = Date.now();
    const result = await ask(body.question, body.projectId);
    const durationMs = Date.now() - start;

    // Persist to ask_log so the chat panel can replay history (U-1).
    // Failures here must not affect the user-facing response.
    void appendAsk({
      projectId: body.projectId,
      userId: user.id,
      question: body.question,
      result,
      durationMs,
    }).catch((err) => console.warn("ask_log append failed:", err));

    return NextResponse.json(result);
  } catch (err) {
    return safeError(err);
  }
}
