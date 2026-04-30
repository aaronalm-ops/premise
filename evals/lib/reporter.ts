import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { EvalRunSummary, ProbeResult, ProbeType } from "./types";

const CHECK = "[ OK ]";
const X = "[FAIL]";

export function logResult(r: ProbeResult): void {
  const tag = r.passed ? CHECK : X;
  const ms = `${r.duration_ms}ms`.padStart(7);
  console.log(`${tag}  ${r.probe_type.padEnd(20)} ${r.probe_id.padEnd(34)} ${ms}  ${r.description}`);
  if (!r.passed && r.reasons.length > 0) {
    for (const reason of r.reasons) {
      console.log(`        - ${reason}`);
    }
  }
}

export function summarise(results: ProbeResult[], startedAt: Date, finishedAt: Date): EvalRunSummary {
  const types: ProbeType[] = [
    "golden-qa",
    "abstention",
    "hallucination",
    "hypothesis-quality",
    "persona-quality",
    "confidentiality",
  ];

  const by_type: EvalRunSummary["by_type"] = {} as EvalRunSummary["by_type"];
  for (const t of types) {
    const subset = results.filter((r) => r.probe_type === t);
    by_type[t] = {
      total: subset.length,
      passed: subset.filter((r) => r.passed).length,
      failed: subset.filter((r) => !r.passed).length,
    };
  }

  return {
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    duration_ms: finishedAt.getTime() - startedAt.getTime(),
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    by_type,
    results,
  };
}

export function logSummary(s: EvalRunSummary): void {
  console.log("\n=== Summary ===");
  console.log(`Total: ${s.total}  Passed: ${s.passed}  Failed: ${s.failed}  Duration: ${(s.duration_ms / 1000).toFixed(1)}s\n`);
  console.log("By type:");
  for (const [t, v] of Object.entries(s.by_type)) {
    if (v.total === 0) continue;
    console.log(`  ${t.padEnd(20)} ${v.passed}/${v.total} passed`);
  }
}

export function writeSummary(s: EvalRunSummary, dir: string): string {
  mkdirSync(dir, { recursive: true });
  const filename = `${s.started_at.replace(/[:.]/g, "-").replace("T", "_").slice(0, 19)}.json`;
  const path = join(dir, filename);
  writeFileSync(path, JSON.stringify(s, null, 2));
  return path;
}
