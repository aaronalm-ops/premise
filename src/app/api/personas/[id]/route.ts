import { NextResponse } from "next/server";
import { updatePersona } from "@/lib/db/personas";
import { IdParam, UpdatePersonaBody } from "@/lib/validation/schemas";
import { safeError } from "@/lib/api/safe-error";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = IdParam.parse(await params);
    const body = UpdatePersonaBody.parse(await req.json());
    const persona = await updatePersona({ id, status: body.status });
    return NextResponse.json({ persona });
  } catch (err) {
    return safeError(err);
  }
}
