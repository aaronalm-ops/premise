import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/db/supabase";
import { IdParam } from "@/lib/validation/schemas";
import { HttpError, safeError } from "@/lib/api/safe-error";
import { assertProjectAccess, requireUser } from "@/lib/auth/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = IdParam.parse(await params);
    await assertProjectAccess(id, user.id);

    // Refuse to delete public libraries via this endpoint — those are
    // admin-managed (see seed-public-library script). User-deletable projects
    // are user-owned, non-public.
    const supabase = getSupabaseServer();
    const { data: project } = await supabase
      .from("projects")
      .select("is_public, owner_id")
      .eq("id", id)
      .maybeSingle();
    if (!project) throw new HttpError(404, "Project not found.");
    if ((project as { is_public: boolean }).is_public) {
      throw new HttpError(
        403,
        "Public libraries can't be deleted from the UI.",
      );
    }
    if ((project as { owner_id: string | null }).owner_id !== user.id) {
      throw new HttpError(403, "Only the project owner can delete it.");
    }

    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) throw new HttpError(500, "Could not delete project.");

    return NextResponse.json({ ok: true });
  } catch (err) {
    return safeError(err);
  }
}
