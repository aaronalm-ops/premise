// Eval harness setup: idempotently provisions two projects (A and B) and
// ingests the fixture corpus into them.
//
// Project A holds the public corpus (fixtures 01, 02, 03).
// Project B holds the confidential fixture (04 — Project Atlas).
// Confidentiality probes verify that querying A never surfaces chunks from B.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createProject } from "@/lib/db/projects";
import { ingestDocument } from "@/lib/db/documents";
import type { EvalConfig } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CONFIG_PATH = join(ROOT, ".config.json");
const FIXTURES_DIR = join(ROOT, "fixtures");

const PROJECT_A_FIXTURES = [
  "01-ai-research-tools.md",
  "02-sustainability-insights.md",
  "03-consumer-trust.md",
];
const PROJECT_B_FIXTURES = ["04-confidential-project-atlas.md"];

export function loadConfig(): EvalConfig | null {
  if (!existsSync(CONFIG_PATH)) return null;
  return JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as EvalConfig;
}

function saveConfig(config: EvalConfig): void {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export async function setup(): Promise<EvalConfig> {
  const existing = loadConfig();
  if (existing) {
    console.log(`Reusing eval config: project A=${existing.project_a_id}, project B=${existing.project_b_id}`);
    await ensureFixtures(existing);
    return existing;
  }

  console.log("First-time eval setup: creating projects and ingesting fixtures...");

  const projectA = await createProject({
    name: "premise-evals-A (do not use for real work)",
    description: "Eval harness — public corpus (fixtures 01-03).",
    confidentiality: "public",
  });
  const projectB = await createProject({
    name: "premise-evals-B (do not use for real work)",
    description: "Eval harness — confidential corpus (fixture 04). Used to verify cross-project isolation.",
    confidentiality: "client-confidential",
  });

  console.log(`  Project A: ${projectA.id}`);
  console.log(`  Project B: ${projectB.id}`);

  const config: EvalConfig = {
    project_a_id: projectA.id,
    project_b_id: projectB.id,
    fixtures_ingested: [],
    created_at: new Date().toISOString(),
  };

  saveConfig(config);
  await ensureFixtures(config);
  return config;
}

async function ensureFixtures(config: EvalConfig): Promise<void> {
  const ingested = new Set(config.fixtures_ingested);

  for (const f of PROJECT_A_FIXTURES) {
    if (ingested.has(`A:${f}`)) continue;
    const content = readFileSync(join(FIXTURES_DIR, f), "utf8");
    console.log(`  Ingesting ${f} into project A...`);
    await ingestDocument({
      projectId: config.project_a_id,
      title: f,
      text: content,
      sourcePath: `evals/fixtures/${f}`,
      mimeType: "text/markdown",
    });
    ingested.add(`A:${f}`);
  }

  for (const f of PROJECT_B_FIXTURES) {
    if (ingested.has(`B:${f}`)) continue;
    const content = readFileSync(join(FIXTURES_DIR, f), "utf8");
    console.log(`  Ingesting ${f} into project B...`);
    await ingestDocument({
      projectId: config.project_b_id,
      title: f,
      text: content,
      sourcePath: `evals/fixtures/${f}`,
      mimeType: "text/markdown",
    });
    ingested.add(`B:${f}`);
  }

  config.fixtures_ingested = Array.from(ingested);
  saveConfig(config);
}

export async function reset(): Promise<void> {
  // Delete the config so the next run creates fresh projects.
  // Existing Supabase projects remain — they're cheap and easy to garbage-collect manually.
  // (Auto-deletion would require service-role mass-delete which is outside the scope of an eval CLI.)
  if (existsSync(CONFIG_PATH)) {
    const fs = await import("node:fs/promises");
    await fs.unlink(CONFIG_PATH);
    console.log("Deleted evals/.config.json — next run will create fresh eval projects.");
    console.log("Old eval projects remain in Supabase; delete them manually if needed.");
  } else {
    console.log("No evals/.config.json found — nothing to reset.");
  }
}
