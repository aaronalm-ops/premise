import { NextResponse } from "next/server";
import { getStoryAngle, updateStoryAngle } from "@/lib/db/stories";
import { getBrief } from "@/lib/db/briefs";
import { getAnalysisWithData } from "@/lib/db/analysis";
import { draftOutline } from "@/lib/rag/story-generator";
import { getSupabaseServer } from "@/lib/db/supabase";
import { IdParam } from "@/lib/validation/schemas";
import { HttpError, safeError } from "@/lib/api/safe-error";
import { withGenerationLock } from "@/lib/api/with-lock";
import { assertProjectAccess, requireUser } from "@/lib/auth/server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = IdParam.parse(await params);

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("story_angles")
      .select("project_id")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new HttpError(500, "Could not verify access.");
    if (!data) throw new HttpError(404, "Story angle not found.");
    await assertProjectAccess(data.project_id as string, user.id);

    const angle = await getStoryAngle(id);
    if (!angle) throw new HttpError(404, "Story angle not found.");
    if (angle.status !== "accepted") {
      throw new HttpError(
        422,
        "Accept the story angle before drafting an outline.",
      );
    }

    const brief = await getBrief(angle.brief_id);
    if (!brief) throw new HttpError(404, "Brief not found.");

    return await withGenerationLock(`outline:${id}`, async () => {
      const analysisRow = await getAnalysisWithData(angle.brief_id);
      const analysis =
        analysisRow && analysisRow.status === "complete" ? analysisRow : null;

      const markdown = await draftOutline({
        angle,
        briefContent: brief.content,
        analysis,
        projectId: angle.project_id,
        briefId: angle.brief_id,
      });

      const updated = await updateStoryAngle({
        id,
        draft_outline: markdown,
      });
      return NextResponse.json({ angle: updated });
    });
  } catch (err) {
    return safeError(err);
  }
}
