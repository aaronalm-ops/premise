import { NextResponse } from "next/server";
import { deleteAnalysisData } from "@/lib/db/analysis";
import { getSupabaseServer } from "@/lib/db/supabase";
import { HttpError, safeError } from "@/lib/api/safe-error";
import { assertBriefAccess, requireUser } from "@/lib/auth/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; dataId: string }> },
) {
  try {
    const user = await requireUser();
    const { id: briefId, dataId } = await params;
    await assertBriefAccess(briefId, user.id);

    // Verify the data row belongs to this brief.
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("analysis_data")
      .select("brief_id")
      .eq("id", dataId)
      .maybeSingle();
    if (error) throw new HttpError(500, "Could not verify data ownership.");
    if (!data) throw new HttpError(404, "Data row not found.");
    if ((data as { brief_id: string }).brief_id !== briefId) {
      throw new HttpError(404, "Data row not found.");
    }

    await deleteAnalysisData(dataId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return safeError(err);
  }
}
