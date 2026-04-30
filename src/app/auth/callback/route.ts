// Handles the redirect target after a magic-link click.
// Supabase puts the OTP code (or token_hash + type) on the URL; we exchange
// it for a session and set the cookie, then redirect into the app.

import { NextResponse } from "next/server";
import { getServerSupabaseAuth } from "@/lib/auth/server";
import { getSupabaseServer } from "@/lib/db/supabase";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
  }

  const supabase = await getServerSupabaseAuth();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    const errMsg = encodeURIComponent(error?.message ?? "auth_failed");
    return NextResponse.redirect(
      new URL(`/login?error=${errMsg}`, url.origin),
    );
  }

  // First-sign-in courtesy: claim any orphan (NULL-owner) projects to this user.
  // The Postgres function returns 0 if any other user has already claimed
  // anything, so this is safe under multi-user scenarios too.
  try {
    const service = getSupabaseServer();
    await service.rpc("claim_orphan_projects", { p_user_id: data.user.id });
  } catch (err) {
    // Non-fatal; user can sign in even if claim fails.
    console.warn("claim_orphan_projects:", err);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
