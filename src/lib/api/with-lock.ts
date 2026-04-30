// Generation-endpoint idempotency.
// Prevents double-clicks and parallel requests on the same logical operation
// from racing against each other (e.g. two concurrent "regenerate hypotheses"
// calls causing duplicate inserts or partial deletes).
//
// We use a Postgres unique-constraint table as a mutex: insert succeeds for
// the first caller, fails for any concurrent caller while the lock is held.
// Locks have a TTL so a crashed handler doesn't permanently jam the endpoint.

import { getSupabaseServer } from "@/lib/db/supabase";
import { HttpError } from "./safe-error";

const DEFAULT_TTL_MS = 60_000; // 60 seconds — generations should never take longer
const SWEEP_BEFORE_ACQUIRE = true;

export async function withGenerationLock<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<T> {
  const supabase = getSupabaseServer();
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();

  if (SWEEP_BEFORE_ACQUIRE) {
    // Best-effort sweep of stale locks (whose TTL has expired).
    await supabase
      .from("generation_locks")
      .delete()
      .lt("expires_at", new Date().toISOString());
  }

  // Try to acquire the lock by inserting a row. The unique constraint on `key`
  // means concurrent inserts will fail with a 23505 (unique violation) error.
  const { error: acquireErr } = await supabase
    .from("generation_locks")
    .insert({ key, expires_at: expiresAt });

  if (acquireErr) {
    if (acquireErr.code === "23505") {
      throw new HttpError(
        409,
        "Another generation request for this resource is already in progress. Please wait a moment and try again.",
      );
    }
    throw new HttpError(
      500,
      "Could not acquire generation lock — please retry.",
    );
  }

  try {
    return await fn();
  } finally {
    await supabase.from("generation_locks").delete().eq("key", key);
  }
}
