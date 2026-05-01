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

    const supabase = getSupabaseServer();
    const { data: doc, error: lookupErr } = await supabase
      .from("documents")
      .select("project_id")
      .eq("id", id)
      .maybeSingle();
    if (lookupErr) throw new HttpError(500, "Could not verify access.");
    if (!doc) throw new HttpError(404, "Document not found.");

    await assertProjectAccess((doc as { project_id: string }).project_id, user.id);

    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) throw new HttpError(500, "Could not delete document.");

    return NextResponse.json({ ok: true });
  } catch (err) {
    return safeError(err);
  }
}
