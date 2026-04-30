import { NextResponse } from "next/server";
import { ingestDocument, listDocuments } from "@/lib/db/documents";
import { extractFromFile } from "@/lib/ingest/extractors";
import { IdParam } from "@/lib/validation/schemas";
import { HttpError, safeError } from "@/lib/api/safe-error";
import { assertProjectAccess, requireUser } from "@/lib/auth/server";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = IdParam.parse(await params);
    await assertProjectAccess(id, user.id);
    const documents = await listDocuments(id);
    return NextResponse.json({ documents });
  } catch (err) {
    return safeError(err);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id: projectId } = IdParam.parse(await params);
    await assertProjectAccess(projectId, user.id);

    const form = await req.formData();
    const file = form.get("file");
    const title = (form.get("title") as string | null)?.trim() || null;

    if (!file || !(file instanceof File)) {
      throw new HttpError(400, "Field 'file' is required as multipart upload.");
    }

    const bytes = await file.arrayBuffer();
    const extracted = await extractFromFile({
      filename: file.name,
      mimeType: file.type,
      bytes,
    });

    if (extracted.text.trim().length < 30) {
      throw new HttpError(
        422,
        "The file produced almost no extractable text. It may be scanned, image-only, or empty.",
      );
    }

    const result = await ingestDocument({
      projectId,
      title: title ?? extracted.title ?? file.name,
      text: extracted.text,
      sourcePath: file.name,
      mimeType: extracted.mimeType,
    });

    return NextResponse.json({
      document: result.document,
      chunkCount: result.chunkCount,
      embeddingTokens: result.embeddingTokens,
      skippedDuplicate: result.skippedDuplicate,
    });
  } catch (err) {
    return safeError(err);
  }
}
