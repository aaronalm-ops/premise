import { NextResponse } from "next/server";
import {
  getRecommendation,
  updateRecommendation,
} from "@/lib/db/recommendations";
import { getSupabaseServer } from "@/lib/db/supabase";
import { IdParam, UpdateRecommendationBody } from "@/lib/validation/schemas";
import { HttpError, safeError } from "@/lib/api/safe-error";
import { assertProjectAccess, requireUser } from "@/lib/auth/server";

async function assertRecommendationAccess(
  recommendationId: string,
  userId: string,
) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("recommendations")
    .select("project_id")
    .eq("id", recommendationId)
    .maybeSingle();
  if (error) throw new HttpError(500, "Could not verify access.");
  if (!data) throw new HttpError(404, "Recommendation not found.");
  await assertProjectAccess(data.project_id as string, userId);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = IdParam.parse(await params);
    await assertRecommendationAccess(id, user.id);
    const recommendation = await getRecommendation(id);
    if (!recommendation)
      throw new HttpError(404, "Recommendation not found.");
    return NextResponse.json({ recommendation });
  } catch (err) {
    return safeError(err);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = IdParam.parse(await params);
    await assertRecommendationAccess(id, user.id);
    const body = UpdateRecommendationBody.parse(await req.json());
    const recommendation = await updateRecommendation({
      id,
      status: body.status,
      insight: body.insight,
      recommended_action: body.recommended_action,
      caveats: body.caveats,
      rejection_reason: body.rejection_reason,
    });
    return NextResponse.json({ recommendation });
  } catch (err) {
    return safeError(err);
  }
}
