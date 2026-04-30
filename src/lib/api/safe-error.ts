// Production-safe error responses.
// In dev, we surface the real error message + stack to make debugging fast.
// In production, internal errors are replaced with a generic message + a
// request id; the real error is logged server-side.

import { NextResponse } from "next/server";
import { ZodError } from "zod";

const isProduction = process.env.NODE_ENV === "production";

export class HttpError extends Error {
  constructor(
    public status: number,
    public publicMessage: string,
    public details?: unknown,
  ) {
    super(publicMessage);
  }
}

function newRequestId(): string {
  return crypto.randomUUID();
}

export function safeError(err: unknown): NextResponse {
  // Validation failures from Zod are always safe to surface (they're about
  // user input and don't leak internal state).
  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Invalid request",
        issues: err.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  // Explicit HttpError thrown from app code carries an intentional public message.
  if (err instanceof HttpError) {
    return NextResponse.json(
      { error: err.publicMessage, ...(err.details ? { details: err.details } : {}) },
      { status: err.status },
    );
  }

  // Anything else: log the real error server-side, return a generic message
  // (or the real one in dev for debuggability).
  const requestId = newRequestId();
  console.error(`[error ${requestId}]`, err);

  if (!isProduction) {
    return NextResponse.json(
      {
        error: (err as Error)?.message ?? "Internal server error",
        request_id: requestId,
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      error: "Internal server error. Reference this id when reporting.",
      request_id: requestId,
    },
    { status: 500 },
  );
}
