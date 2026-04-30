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

// Atomic replace via the replace_proposed_personas Postgres function (D-026).
export async function replaceProposedPersonas(input: {
  briefId: string;
  projectId: string;
  drafts: PersonaDraft[];
}): Promise<Persona[]> {
  const supabase = getSupabaseServer();

  if (input.drafts.length === 0) {
    await supabase
      .from("personas")
      .delete()
      .eq("brief_id", input.briefId)
      .eq("status", "proposed");
    return [];
  }

  const sorted = [...input.drafts].sort((a, b) => b.priority - a.priority);

  const { error: rpcErr } = await supabase.rpc("replace_proposed_personas", {
    p_brief_id: input.briefId,
    p_project_id: input.projectId,
    p_drafts: sorted,
  });
  if (rpcErr) throw new Error(`replaceProposedPersonas: ${rpcErr.message}`);

  return listPersonas(input.briefId).then((all) =>
    all.filter((p) => p.status === "proposed"),
  );
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
