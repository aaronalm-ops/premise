import { getSupabaseServer } from "@/lib/db/supabase";
import type { Confidentiality, Project } from "@/lib/rag/types";

export async function listProjects(): Promise<Project[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listProjects: ${error.message}`);
  return (data ?? []) as Project[];
}

export async function createProject(input: {
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
