import { getBrief } from "@/lib/db/briefs";
import { listHypotheses } from "@/lib/db/hypotheses";
import { listQuestionsWithVariants } from "@/lib/db/questions";
import {
  exportQuestionnaire,
  type ExportFormat,
} from "@/lib/exporters/questionnaire";
import { assertBriefAccess, requireUser } from "@/lib/auth/server";
import { safeError } from "@/lib/api/safe-error";

const VALID_FORMATS: ExportFormat[] = ["markdown", "qualtrics", "plaintext"];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const url = new URL(req.url);
    const formatParam = url.searchParams.get("format") ?? "markdown";
    const download = url.searchParams.get("download") === "1";

    if (!VALID_FORMATS.includes(formatParam as ExportFormat)) {
      return new Response(
        JSON.stringify({
          error: `format must be one of: ${VALID_FORMATS.join(", ")}`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    await assertBriefAccess(id, user.id);
    const brief = await getBrief(id);
    if (!brief) {
      return new Response(JSON.stringify({ error: "brief not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    const hypotheses = await listHypotheses(id);
    const questions = await listQuestionsWithVariants(id);

    const { content, mime, filename } = exportQuestionnaire(
      { brief, hypotheses, questions },
      formatParam as ExportFormat,
    );

    const headers: Record<string, string> = {
      "Content-Type": `${mime}; charset=utf-8`,
    };
    if (download) {
      headers["Content-Disposition"] = `attachment; filename="${filename}"`;
    }

    return new Response(content, { status: 200, headers });
  } catch (err) {
    return safeError(err);
  }
}
