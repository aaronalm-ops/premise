// Premise — public library bootstrap.
//
// Usage: npm run seed-public-library
//
// Idempotent. Creates a project named "Premise Public Library" with
// is_public = true and owner_id = NULL (so it's globally accessible — D-033).
// Returns its ID. Use that ID with `npm run ingest -- <id> <file>` to populate.
//
// Recommended seed content:
//   - Methodology references (research-design textbook chapters in the
//     public domain, sampling theory, qualitative coding guides)
//   - Open-licence industry reports (government/NGO data, Creative Commons
//     research)
//   - Premise's own docs (case study, decisions log) for meta-learning
//
// Avoid copyrighted client work or paid-research extracts.

import { getSupabaseServer } from "@/lib/db/supabase";

const LIBRARY_NAME = "Premise Public Library";

async function main() {
  const supabase = getSupabaseServer();

  const { data: existing } = await supabase
    .from("projects")
    .select("*")
    .eq("name", LIBRARY_NAME)
    .eq("is_public", true)
    .maybeSingle();

  if (existing) {
    console.log("Public library already exists:");
    console.log(`  id: ${existing.id}`);
    console.log(`  name: ${existing.name}`);
    console.log(
      `\nIngest more content with: npm run ingest -- ${existing.id} <filePath>`,
    );
    return;
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: LIBRARY_NAME,
      description:
        "Default public corpus shared across all users. Methodology references, open-licence industry reports, and meta-content. Read-only at the user level.",
      confidentiality: "public",
      is_public: true,
      owner_id: null,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("Failed to create public library:", error?.message);
    process.exit(1);
  }

  console.log("Public library created:");
  console.log(`  id:   ${data.id}`);
  console.log(`  name: ${data.name}`);
  console.log(`  is_public: true`);
  console.log("");
  console.log(
    "Populate it with: npm run ingest -- " + data.id + " <filePath>",
  );
  console.log("");
  console.log("Suggested first ingestions:");
  console.log("  npm run ingest -- " + data.id + " docs/CASE_STUDY.md");
  console.log("  npm run ingest -- " + data.id + " docs/DECISIONS.md");
  console.log(
    "  (and any methodology reference PDFs / DOCX you have at hand)",
  );
}

main().catch((err) => {
  console.error("seed-public-library failed:", err);
  process.exit(1);
});
