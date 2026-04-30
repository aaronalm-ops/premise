import { NextResponse } from "next/server";
import { z } from "zod";
import { ingestDocument } from "@/lib/db/documents";
import { fetchAndExtract } from "@/lib/ingest/url-fetch";
import { IdParam } from "@/lib/validation/schemas";
import { HttpError, safeError } from "@/lib/api/safe-error";
import { assertProjectAccess, requireUser } from "@/lib/auth/server";

export const runtime = "nodejs";

const Body = z.object({
  url: z.string().url(),
  title: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id: projectId } = IdParam.parse(await params);
    await assertProjectAccess(projectId, user.id);
    const { url, title } = Body.parse(await req.json());

    const article = await fetchAndExtract(url);

    if (article.text.length < 100) {
      throw new HttpError(
        422,
        "The URL did not yield enough readable text. The page may be paywalled or JS-rendered.",
      );
    }

    const result = await ingestDocument({
      projectId,
      title: title ?? article.title,
      text: article.text,
      sourcePath: url,
      mimeType: "text/html",
    });

    return NextResponse.json({
      document: result.document,
      chunkCount: result.chunkCount,
      embeddingTokens: result.embeddingTokens,
      skippedDuplicate: result.skippedDuplicate,
      source: {
        url,
        title: article.title,
        byline: article.byline,
        site_name: article.site_name,
      },
    });
  } catch (err) {
    return safeError(err);
  }
}
