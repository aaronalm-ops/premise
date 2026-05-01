import { NextResponse } from "next/server";
import { z } from "zod";
import {
  addAnalysisData,
  getOrCreateAnalysis,
} from "@/lib/db/analysis";
import { extractFromFile } from "@/lib/ingest/extractors";
import { IdParam } from "@/lib/validation/schemas";
import { HttpError, safeError } from "@/lib/api/safe-error";
import { assertBriefAccess, requireUser } from "@/lib/auth/server";

export const runtime = "nodejs";

const SOURCE_TYPES = ["csv", "transcript", "paste", "notes"] as const;

const PasteBody = z.object({
  source_type: z.enum(SOURCE_TYPES),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(200_000),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id: briefId } = IdParam.parse(await params);
    await assertBriefAccess(briefId, user.id);

    const contentType = req.headers.get("content-type") ?? "";
    let sourceType: (typeof SOURCE_TYPES)[number];
    let title: string;
    let content: string;
    let projectId: string;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!file || !(file instanceof File)) {
        throw new HttpError(400, "Field 'file' is required for upload.");
      }
      const declared = (form.get("source_type") as string | null) ?? "csv";
      if (!SOURCE_TYPES.includes(declared as (typeof SOURCE_TYPES)[number])) {
        throw new HttpError(400, "Invalid source_type.");
      }
      sourceType = declared as (typeof SOURCE_TYPES)[number];
      const bytes = await file.arrayBuffer();
      const extracted = await extractFromFile({
        filename: file.name,
        mimeType: file.type,
        bytes,
      });
      title = (form.get("title") as string | null) ?? extracted.title ?? file.name;
      content = extracted.text;
    } else {
      const body = PasteBody.parse(await req.json());
      sourceType = body.source_type;
      title = body.title;
      content = body.content;
    }

    if (content.trim().length < 30) {
      throw new HttpError(
        422,
        "Source has almost no extractable text — minimum 30 chars.",
      );
    }

    // Resolve projectId from brief.
    const { projectId: pid } = await assertBriefAccess(briefId, user.id);
    projectId = pid;

    const analysis = await getOrCreateAnalysis(briefId, projectId);
    const row = await addAnalysisData({
      analysisId: analysis.id,
      briefId,
      projectId,
      sourceType,
      title,
      content,
    });
    return NextResponse.json({ data: row });
  } catch (err) {
    return safeError(err);
  }
}
