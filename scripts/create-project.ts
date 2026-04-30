// Premise — project creation CLI.
//
// Usage:
//   npm run create-project -- "Project name" [confidentiality] [description]
//
// confidentiality: public | client-confidential | nda-restricted (default)
//
// Prints the new project's id, which you'll need for subsequent ingestion.

import { createProject } from "@/lib/db/projects";
import type { Confidentiality } from "@/lib/rag/types";

const VALID: Confidentiality[] = ["public", "client-confidential", "nda-restricted"];

async function main() {
  const [name, confArg, ...descParts] = process.argv.slice(2);

  if (!name) {
    console.error('Usage: npm run create-project -- "Project name" [confidentiality] [description]');
    process.exit(1);
  }

  const confidentiality = (confArg && VALID.includes(confArg as Confidentiality)
    ? (confArg as Confidentiality)
    : "client-confidential");

  const description = descParts.join(" ").trim() || null;

  const project = await createProject({ name, description, confidentiality });

  console.log("Project created:");
  console.log(`  id:              ${project.id}`);
  console.log(`  name:            ${project.name}`);
  console.log(`  confidentiality: ${project.confidentiality}`);
  if (project.description) console.log(`  description:     ${project.description}`);
  console.log("\nUse the id above with: npm run ingest -- " + project.id + " <filePath>");
}

main().catch((err) => {
  console.error("create-project failed:", err);
  process.exit(1);
});
