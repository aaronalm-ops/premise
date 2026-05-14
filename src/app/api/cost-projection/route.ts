import { NextResponse } from "next/server";
import { z } from "zod";
import {
  DEFAULT_PROJECTION_INPUT,
  observedBucketAverages,
  projectCostPerStudy,
} from "@/lib/db/cost-projection";
import { safeError } from "@/lib/api/safe-error";

// D-043: public, no auth. Exposes aggregated cost averages — no project id,
// no project content, no per-call rows. Safe to surface on a marketing page
// because the response is anonymised aggregation. Same private-share posture
// as the live demo (D-030) — semi-public, linkable, not broadcast.

const Query = z.object({
  docs: z.coerce.number().int().min(0).max(10_000).optional(),
  questions: z.coerce.number().int().min(0).max(10_000).optional(),
  generations_per_stage: z.coerce.number().int().min(0).max(20).optional(),
  outlines: z.coerce.number().int().min(0).max(20).optional(),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = Query.parse(Object.fromEntries(url.searchParams));
    const input = {
      docs: parsed.docs ?? DEFAULT_PROJECTION_INPUT.docs,
      questions: parsed.questions ?? DEFAULT_PROJECTION_INPUT.questions,
      generations_per_stage:
        parsed.generations_per_stage ??
        DEFAULT_PROJECTION_INPUT.generations_per_stage,
      outlines: parsed.outlines ?? DEFAULT_PROJECTION_INPUT.outlines,
    };

    const observed = await observedBucketAverages();
    const projection = projectCostPerStudy(observed, input);

    return NextResponse.json({
      input,
      observed_total_calls: observed.reduce((a, o) => a + o.call_count, 0),
      projection,
    });
  } catch (err) {
    return safeError(err);
  }
}
