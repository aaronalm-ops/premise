import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/db/supabase";
import { IdParam } from "@/lib/validation/schemas";
import { HttpError, safeError } from "@/lib/api/safe-error";
import { assertProjectAccess, requireUser } from "@/lib/auth/server";
import {
  getProject,
  setProjectIncludePublicLibraries,
} from "@/lib/db/projects";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = IdParam.parse(await params);
    await assertProjectAccess(id, user.id);
    const project = await getProject(id);
    if (!project) throw new HttpError(404, "Project not found.");
    return NextResponse.json({ project });
  } catch (err) {
    return safeError(err);
  }
}

// PATCH supports a narrow set of mutations that don't deserve their own
// route (D-047: include_public_libraries toggle).
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = IdParam.parse(await params);
    await assertProjectAccess(id, user.id);

    const body = (await req.json()) as {
      include_public_libraries?: boolean;
    };

    // Public libraries can't be edited from the UI — including changing
    // their inclusion flag (the flag is meaningless on public projects).
    const existing = await getProject(id);
    if (!existing) throw new HttpError(404, "Project not found.");
    if (existing.is_public) {
      throw new HttpError(
        403,
        "Public libraries are read-only — they can't be edited from the UI.",
      );
    }

    if (typeof body.include_public_libraries === "boolean") {
      await setProjectIncludePublicLibraries(
        id,
        body.include_public_libraries,
      );
    }

    const updated = await getProject(id);
    return NextResponse.json({ project: updated });
  } catch (err) {
    return safeError(err);
  }
}

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
