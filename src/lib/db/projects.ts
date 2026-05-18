import { getSupabaseServer } from "@/lib/db/supabase";
import type { Confidentiality, Project } from "@/lib/rag/types";

// Public-library cache. Public projects change rarely; refresh every 60s.
let publicLibraryCache: { ids: string[]; expiresAt: number } | null = null;
const PUBLIC_CACHE_TTL_MS = 60_000;

export async function getPublicLibraryIds(): Promise<string[]> {
  if (publicLibraryCache && publicLibraryCache.expiresAt > Date.now()) {
    return publicLibraryCache.ids;
  }
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("is_public", true);
  if (error) {
    console.warn("getPublicLibraryIds:", error.message);
    return [];
  }
  const ids = (data ?? []).map((p) => (p as { id: string }).id);
  publicLibraryCache = { ids, expiresAt: Date.now() + PUBLIC_CACHE_TTL_MS };
  return ids;
}

export async function listPublicLibraries(): Promise<Project[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("is_public", true)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`listPublicLibraries: ${error.message}`);
  return (data ?? []) as Project[];
}

// Lists projects visible to the user: their own + any orphan (NULL-owner)
// projects from before auth shipped (D-032).
export async function listProjects(userId: string): Promise<Project[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .or(`owner_id.eq.${userId},owner_id.is.null`)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listProjects: ${error.message}`);
  return (data ?? []) as Project[];
}

export async function createProject(input: {
  ownerId: string;
  name: string;
  description?: string | null;
  confidentiality?: Confidentiality;
}): Promise<Project> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: input.name,
      description: input.description ?? null,
      confidentiality: input.confidentiality ?? "client-confidential",
      owner_id: input.ownerId,
    })
    .select("*")
    .single();
  if (error) throw new Error(`createProject: ${error.message}`);
  return data as Project;
}

export async function getProject(id: string): Promise<Project | null> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getProject: ${error.message}`);
  return (data ?? null) as Project | null;
}

// D-047: per-project opt-in flag for retrieval-time inclusion of public-
// library chunks. The public library itself is read-only (admin-managed
// via scripts/seed-public-corpus.ts); this flag controls whether a user's
// own project pulls from it during /ask, hypothesis-gen, persona-gen, etc.
export async function setProjectIncludePublicLibraries(
  id: string,
  include: boolean,
): Promise<void> {
  const supabase = getSupabaseServer();
  const { error } = await supabase
    .from("projects")
    .update({ include_public_libraries: include })
    .eq("id", id);
  if (error) {
    throw new Error(`setProjectIncludePublicLibraries: ${error.message}`);
  }
}
