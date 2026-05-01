// Premise eval harness — CLI entry point.
//
// Usage:
//   npm run eval                  # full run
//   npm run eval -- --type=golden-qa  # single type
//   npm run eval:setup            # setup only (create projects + ingest fixtures)
//   npm run eval:reset            # discard config so next run creates fresh projects

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setup, reset } from "./lib/setup";
import { logResult, logSummary, summarise, writeSummary } from "./lib/reporter";
import { runGoldenQa } from "./runners/golden-qa";
import { runAbstention } from "./runners/abstention";
import { runHallucination } from "./runners/hallucination";
import { runHypothesisQuality } from "./runners/hypothesis-quality";
import { runPersonaQuality } from "./runners/persona-quality";
import { runConfidentiality } from "./runners/confidentiality";
import type { ProbeResult, ProbeType } from "./lib/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(__dirname, "results");

const ALL_TYPES: ProbeType[] = [
  "golden-qa",
  "abstention",
  "hallucination",
  "hypothesis-quality",
  "persona-quality",
  "confidentiality",
];

function parseArgs(argv: string[]): {
  setupOnly: boolean;
  reset: boolean;
  types: ProbeType[];
} {
  const setupOnly = argv.includes("--setup-only");
  const wantReset = argv.includes("--reset");

  const typeArg = argv.find((a) => a.startsWith("--type="));
  let types: ProbeType[] = ALL_TYPES;
  if (typeArg) {
    const v = typeArg.split("=")[1] as ProbeType;
    if (!ALL_TYPES.includes(v)) {
      console.error(`Unknown type "${v}". Valid: ${ALL_TYPES.join(", ")}`);
      process.exit(1);
    }
    types = [v];
  }

  return { setupOnly, reset: wantReset, types };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.reset) {
    await reset();
    return;
  }

  console.log("Premise eval harness\n");

  const config = await setup();

  if (args.setupOnly) {
    console.log("\nSetup complete. Run `npm run eval` to execute probes.");
    return;
  }

  console.log("\n=== Running probes ===\n");

  const startedAt = new Date();
  const results: ProbeResult[] = [];

  for (const type of args.types) {
    let typeResults: ProbeResult[] = [];
    switch (type) {
      case "golden-qa":
        typeResults = await runGoldenQa(config.project_a_id);
        break;
      case "abstention":
        typeResults = await runAbstention(config.project_a_id);
        break;
      case "hallucination":
        typeResults = await runHallucination(config.project_a_id);
        break;
      case "hypothesis-quality":
        typeResults = await runHypothesisQuality(config.project_a_id);
        break;
      case "persona-quality":
        typeResults = await runPersonaQuality(config.project_a_id);
        break;
      case "confidentiality":
        typeResults = await runConfidentiality(config);
        break;
    }
    for (const r of typeResults) {
      logResult(r);
      results.push(r);
    }
  }

  const finishedAt = new Date();
  const summary = summarise(results, startedAt, finishedAt);

  // Cost regression: query api_calls for everything recorded during this run.
  try {
    const { getSupabaseServer } = await import("@/lib/db/supabase");
    const supabase = getSupabaseServer();
    const { data } = await supabase
      .from("api_calls")
      .select(
        "cost_usd, input_tokens, cached_input_tokens",
      )
      .gte("created_at", startedAt.toISOString());
    if (data && data.length > 0) {
      let total = 0;
      let cached = 0;
      let inputTotal = 0;
      for (const row of data as Array<{
        cost_usd: number | string;
        input_tokens: number;
        cached_input_tokens: number;
      }>) {
        total +=
          typeof row.cost_usd === "string"
            ? parseFloat(row.cost_usd)
            : row.cost_usd;
        cached += row.cached_input_tokens ?? 0;
        inputTotal += (row.input_tokens ?? 0) + (row.cached_input_tokens ?? 0);
      }
      summary.cost = {
        total_usd: total,
        call_count: data.length,
        cache_hit_rate: inputTotal > 0 ? cached / inputTotal : 0,
      };
    }
  } catch (err) {
    console.warn("Could not fetch cost data:", err);
  }

  logSummary(summary);

  const path = writeSummary(summary, RESULTS_DIR);
  console.log(`\nFull results: ${path}`);

  process.exit(summary.failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Eval runner crashed:", err);
  process.exit(1);
});
