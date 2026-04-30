// Refresh the Supabase auth session cookie on every navigation so the
// server-side `getCurrentUser()` reads a current session.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return response;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: Array<{ name: string; value: string; options?: object }>,
      ) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

export const config = {
  // Run on every request except static assets, the health check, and the
  // login/auth callback routes (which manage their own session state).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|icon.svg|api/health|.*\\..*).*)",
  ],
};
