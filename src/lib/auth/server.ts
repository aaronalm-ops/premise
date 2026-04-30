// Server-side Supabase client wired to Next.js cookies for session management.
// Use in route handlers, server components, and server actions.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";
import { HttpError } from "@/lib/api/safe-error";
import { getSupabaseServer } from "@/lib/db/supabase";

export async function getServerSupabaseAuth() {
  const cookieStore = await cookies();
  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: Array<{ name: string; value: string; options?: object }>,
        ) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server components can't set cookies; middleware handles refresh.
          }
        },
      },
    },
  );
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await getServerSupabaseAuth();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new HttpError(401, "Sign in required.");
  }
  return user;
}

// Verify a project belongs to the user. Treats NULL-owner projects as shared
// (backwards compat for projects created before auth shipped — see D-032).
// Throws 404 (not 403) on mismatch so we don't leak existence of other users' projects.
export async function assertProjectAccess(
  projectId: string,
  userId: string,
): Promise<void> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", projectId)
    .maybeSingle();

  if (error) throw new HttpError(500, "Could not verify project access.");
  if (!data) throw new HttpError(404, "Project not found.");

  const ownerId = data.owner_id as string | null;
  if (ownerId !== null && ownerId !== userId) {
    throw new HttpError(404, "Project not found.");
  }
}

// Same logic for a brief — derives the project_id and checks ownership.
export async function assertBriefAccess(
  briefId: string,
  userId: string,
): Promise<{ projectId: string }> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("briefs")
    .select("project_id")
    .eq("id", briefId)
    .maybeSingle();
  if (error) throw new HttpError(500, "Could not verify brief access.");
  if (!data) throw new HttpError(404, "Brief not found.");
  await assertProjectAccess(data.project_id as string, userId);
  return { projectId: data.project_id as string };
}
