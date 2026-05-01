import { NextResponse } from "next/server";
import { updatePersona } from "@/lib/db/personas";
import { getSupabaseServer } from "@/lib/db/supabase";
import { IdParam, UpdatePersonaBody } from "@/lib/validation/schemas";
import { HttpError, safeError } from "@/lib/api/safe-error";
import { assertProjectAccess, requireUser } from "@/lib/auth/server";

async function assertPersonaAccess(personaId: string, userId: string) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("personas")
    .select("project_id")
    .eq("id", personaId)
    .maybeSingle();
  if (error) throw new HttpError(500, "Could not verify access.");
  if (!data) throw new HttpError(404, "Persona not found.");
  await assertProjectAccess(data.project_id as string, userId);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = IdParam.parse(await params);
    await assertPersonaAccess(id, user.id);
    const body = UpdatePersonaBody.parse(await req.json());
    const persona = await updatePersona({
      id,
      status: body.status,
      rejection_reason: body.rejection_reason,
      name: body.name,
      description: body.description,
      demographic_profile: body.demographic_profile,
      behavioural_profile: body.behavioural_profile,
      under_represents: body.under_represents,
      assumptions: body.assumptions,
    });
    return NextResponse.json({ persona });
  } catch (err) {
    return safeError(err);
  }
}
