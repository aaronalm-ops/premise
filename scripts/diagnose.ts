// Premise — connection diagnostics.
//
// Usage:
//   npm run diagnose
//
// Validates each env var's format and pings each service with a minimal call.
// Use this any time something feels broken — it'll tell you which service is
// the problem in ~5 seconds.

import { getAnthropic, MODELS } from "@/lib/llm/anthropic";
import { getSupabaseServer } from "@/lib/db/supabase";
import { embed } from "@/lib/rag/voyage";

type Check = { label: string; ok: boolean; detail: string };

function fmt(c: Check): string {
  const tag = c.ok ? "[ OK ]" : "[FAIL]";
  return `${tag}  ${c.label}\n        ${c.detail}`;
}

function redact(value: string): string {
  if (value.length <= 12) return "***";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

// ---------- format checks (no network) ----------

function checkSupabaseUrl(): Check {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return { label: "NEXT_PUBLIC_SUPABASE_URL is set", ok: false, detail: "missing" };

  const value = raw.trim();
  const issues: string[] = [];
  if (raw !== value) issues.push("has leading/trailing whitespace (env loader will trim it, but clean up .env.local)");
  if (!value.startsWith("https://")) issues.push("must start with https://");
  if (value.endsWith("/")) issues.push("has a trailing slash — remove it");
  if (!value.includes(".supabase.co")) issues.push("does not look like a Supabase URL (expected ...supabase.co)");
  try { new URL(value); } catch { issues.push("not a valid URL"); }

  if (issues.length > 0) {
    return { label: "NEXT_PUBLIC_SUPABASE_URL format", ok: false, detail: `${value}\n        - ${issues.join("\n        - ")}` };
  }
  return { label: "NEXT_PUBLIC_SUPABASE_URL format", ok: true, detail: value };
}

function checkJwtKey(envVar: string, label: string): Check {
  const raw = process.env[envVar];
  if (!raw) return { label, ok: false, detail: "missing" };
  const value = raw.trim();
  const issues: string[] = [];
  if (raw !== value) issues.push("has leading/trailing whitespace");
  if (!value.startsWith("eyJ")) issues.push("does not look like a JWT (expected to start with eyJ)");
  if (value.length < 100) issues.push("looks too short for a real JWT");
  if (issues.length > 0) {
    return { label, ok: false, detail: `${redact(value)}\n        - ${issues.join("\n        - ")}` };
  }
  return { label, ok: true, detail: redact(value) };
}

function checkAnthropicKey(): Check {
  const raw = process.env.ANTHROPIC_API_KEY;
  if (!raw) return { label: "ANTHROPIC_API_KEY format", ok: false, detail: "missing" };
  const value = raw.trim();
  if (!value.startsWith("sk-ant-")) {
    return { label: "ANTHROPIC_API_KEY format", ok: false, detail: `${redact(value)} — expected to start with sk-ant-` };
  }
  return { label: "ANTHROPIC_API_KEY format", ok: true, detail: redact(value) };
}

function checkVoyageKey(): Check {
  const raw = process.env.VOYAGE_API_KEY;
  if (!raw) return { label: "VOYAGE_API_KEY format", ok: false, detail: "missing" };
  const value = raw.trim();
  if (!value.startsWith("pa-")) {
    return { label: "VOYAGE_API_KEY format", ok: false, detail: `${redact(value)} — expected to start with pa-` };
  }
  return { label: "VOYAGE_API_KEY format", ok: true, detail: redact(value) };
}

function checkKeysDistinct(): Check {
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!anon || !service) return { label: "anon and service-role keys are different", ok: false, detail: "one or both keys missing" };
  if (anon === service) {
    return { label: "anon and service-role keys are different", ok: false, detail: "they are identical — you pasted the same key into both fields" };
  }
  return { label: "anon and service-role keys are different", ok: true, detail: "distinct" };
}

// ---------- live pings ----------

async function pingSupabase(): Promise<Check> {
  try {
    const supabase = getSupabaseServer();
    const { error } = await supabase.from("projects").select("id", { count: "exact", head: true });
    if (error) {
      const hint = error.message.includes("relation")
        ? "\n        Hint: have you applied supabase/migrations/0001_initial_schema.sql in the SQL Editor?"
        : "";
      return { label: "Supabase connection + schema", ok: false, detail: error.message + hint };
    }
    return { label: "Supabase connection + schema", ok: true, detail: "projects table reachable" };
  } catch (err) {
    return { label: "Supabase connection + schema", ok: false, detail: (err as Error).message };
  }
}

async function pingAnthropic(): Promise<Check> {
  try {
    const client = getAnthropic();
    const res = await client.messages.create({
      model: MODELS.haiku,
      max_tokens: 8,
      messages: [{ role: "user", content: "Reply with just the word: ok" }],
    });
    const text = res.content.find((b) => b.type === "text");
    return { label: "Anthropic API ping (Haiku)", ok: true, detail: `model=${res.model} reply=${text && text.type === "text" ? text.text.trim() : "(no text)"}` };
  } catch (err) {
    return { label: "Anthropic API ping (Haiku)", ok: false, detail: (err as Error).message };
  }
}

async function pingVoyage(): Promise<Check> {
  try {
    const result = await embed(["diagnostic ping"], "query");
    if (result.embeddings.length !== 1) {
      return { label: "Voyage embeddings ping", ok: false, detail: `expected 1 embedding, got ${result.embeddings.length}` };
    }
    return { label: "Voyage embeddings ping", ok: true, detail: `dims=${result.embeddings[0].length} tokens=${result.totalTokens}` };
  } catch (err) {
    return { label: "Voyage embeddings ping", ok: false, detail: (err as Error).message };
  }
}

// ---------- runner ----------

async function main() {
  console.log("Premise — connection diagnostics\n");

  const formatChecks: Check[] = [
    checkSupabaseUrl(),
    checkJwtKey("NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY format"),
    checkJwtKey("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY format"),
    checkKeysDistinct(),
    checkAnthropicKey(),
    checkVoyageKey(),
  ];

  console.log("=== Format checks ===");
  for (const c of formatChecks) console.log(fmt(c));

  console.log("\n=== Live pings ===");
  const supa = await pingSupabase();
  console.log(fmt(supa));
  const ant = await pingAnthropic();
  console.log(fmt(ant));
  const voy = await pingVoyage();
  console.log(fmt(voy));

  const all = [...formatChecks, supa, ant, voy];
  const failed = all.filter((c) => !c.ok).length;
  console.log(`\n${failed === 0 ? "All checks passed." : `${failed} check(s) failed — fix above and re-run.`}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Diagnose runner crashed:", err);
  process.exit(1);
});
