import { NextResponse } from "next/server";
import { getServerSupabaseAuth } from "@/lib/auth/server";

export async function POST(request: Request) {
  const supabase = await getServerSupabaseAuth();
  await supabase.auth.signOut();
  const url = new URL(request.url);
  return NextResponse.redirect(new URL("/login", url.origin), { status: 303 });
}
