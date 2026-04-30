import { getSupabaseServer } from "@/lib/db/supabase";
import type {
  HypothesisStatus,
  Persona,
  PersonaDraft,
} from "@/lib/rag/types";

export async function listPersonas(briefId: string): Promise<Persona[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("personas")
    .select("*")
    .eq("brief_id", briefId)
    .order("ordinal", { ascending: true });
  if (error) throw new Error(`listPersonas: ${error.message}`);
  return (data ?? []) as Persona[];
}

export async function replaceProposedPersonas(input: {
  briefId: string;
  projectId: string;
  drafts: PersonaDraft[];
}): Promise<Persona[]> {
  const supabase = getSupabaseServer();

  await supabase
    .from("personas")
    .delete()
    .eq("brief_id", input.briefId)
    .eq("status", "proposed");

  const { data: existing } = await supabase
    .from("personas")
    .select("ordinal")
    .eq("brief_id", input.briefId)
    .order("ordinal", { ascending: false })
    .limit(1);

  const startOrdinal = (existing?.[0]?.ordinal ?? -1) + 1;

  if (input.drafts.length === 0) return [];

  const sorted = [...input.drafts].sort((a, b) => b.priority - a.priority);

  const rows = sorted.map((d, i) => ({
    project_id: input.projectId,
    brief_id: input.briefId,
    ordinal: startOrdinal + i,
    name: d.name,
    description: d.description,
    demographic_profile: d.demographic_profile,
    behavioural_profile: d.behavioural_profile,
    assumptions: d.assumptions,
    under_represents: d.under_represents,
    supporting_chunk_ids: d.supporting_chunk_ids,
    priority: d.priority,
    status: "proposed" as const,
  }));

  const { data, error } = await supabase
    .from("personas")
    .insert(rows)
    .select("*");
  if (error) throw new Error(`replaceProposedPersonas: ${error.message}`);
  return (data ?? []) as Persona[];
}

export async function updatePersona(input: {
  id: string;
  status?: HypothesisStatus;
}): Promise<Persona> {
  const supabase = getSupabaseServer();
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.status !== undefined) patch.status = input.status;

  const { data, error } = await supabase
    .from("personas")
    .update(patch)
    .eq("id", input.id)
    .select("*")
    .single();
  if (error) throw new Error(`updatePersona: ${error.message}`);
  return data as Persona;
}
