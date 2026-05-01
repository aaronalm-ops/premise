import { NextResponse } from "next/server";
import { z } from "zod";
import { getStoryAngle, updateStoryAngle } from "@/lib/db/stories";
import { getSupabaseServer } from "@/lib/db/supabase";
import { IdParam } from "@/lib/validation/schemas";
import { HttpError, safeError } from "@/lib/api/safe-error";
import {
  assertProjectAccess,
  requireUser,
} from "@/lib/auth/server";
import type { HypothesisStatus } from "@/lib/rag/types";

const Body = z
  .object({
    status: z.enum(["proposed", "accepted", "rejected"]).optional(),
    draft_outline: z.string().nullable().optional(),
    rejection_reason: z.string().nullable().optional(),
  })
  .refine((b) => Object.keys(b).length > 0, {
    message: "patch must include at least one field",
  });

async function assertStoryAccess(storyId: string, userId: string) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("story_angles")
    .select("project_id")
    .eq("id", storyId)
    .maybeSingle();
  if (error) throw new HttpError(500, "Could not verify access.");
  if (!data) throw new HttpError(404, "Story angle not found.");
  await assertProjectAccess(data.project_id as string, userId);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = IdParam.parse(await params);
    await assertStoryAccess(id, user.id);
    const angle = await getStoryAngle(id);
    if (!angle) throw new HttpError(404, "Story angle not found.");
    return NextResponse.json({ angle });
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
    await assertStoryAccess(id, user.id);
    const body = Body.parse(await req.json());
    const angle = await updateStoryAngle({
      id,
      status: body.status as HypothesisStatus | undefined,
      draft_outline: body.draft_outline,
      rejection_reason: body.rejection_reason,
    });
    return NextResponse.json({ angle });
  } catch (err) {
    return safeError(err);
  }
}
