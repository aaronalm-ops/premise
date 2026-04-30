// Premise — project creation CLI.
//
// Usage:
//   npm run create-project -- "Project name" [confidentiality] [description]
//
// confidentiality: public | client-confidential | nda-restricted (default)
//
// Note: CLI-created projects start orphaned (NULL owner_id). The first user
// to sign in via the UI claims them via the claim_orphan_projects RPC (D-032).
// For projects already owned, use the UI's "+ New" button instead.

import { getSupabaseServer } from "@/lib/db/supabase";
import type { Confidentiality, Project } from "@/lib/rag/types";

const VALID: Confidentiality[] = [
  "public",
  "client-confidential",
  "nda-restricted",
];

async function main() {
  const [name, confArg, ...descParts] = process.argv.slice(2);

  if (!name) {
    console.error(
      'Usage: npm run create-project -- "Project name" [confidentiality] [description]',
    );
    process.exit(1);
  }

  const confidentiality =
    confArg && VALID.includes(confArg as Confidentiality)
      ? (confArg as Confidentiality)
      : "client-confidential";

  const description = descParts.join(" ").trim() || null;

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("projects")
    .insert({ name, description, confidentiality })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const project = data as Project;

  console.log("Project created (orphan — first UI sign-in claims it):");
  console.log(`  id:              ${project.id}`);
  console.log(`  name:            ${project.name}`);
  console.log(`  confidentiality: ${project.confidentiality}`);
  if (project.description) console.log(`  description:     ${project.description}`);
  console.log(
    "\nUse the id above with: npm run ingest -- " + project.id + " <filePath>",
  );
}

main().catch((err) => {
  console.error("create-project failed:", err);
  process.exit(1);
});
