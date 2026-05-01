import { NextResponse } from "next/server";
import { listPublicLibraries } from "@/lib/db/projects";
import { listDocuments } from "@/lib/db/documents";
import { safeError } from "@/lib/api/safe-error";
import { requireUser } from "@/lib/auth/server";

export async function GET() {
  try {
    await requireUser();
    const libraries = await listPublicLibraries();

    const enriched = await Promise.all(
      libraries.map(async (l) => {
        const docs = await listDocuments(l.id);
        return {
          id: l.id,
          name: l.name,
          description: l.description,
          document_count: docs.length,
          documents: docs.map((d) => ({
            id: d.id,
            title: d.title,
            chunk_count: d.chunk_count ?? 0,
          })),
        };
      }),
    );

    return NextResponse.json({ libraries: enriched });
  } catch (err) {
    return safeError(err);
  }
}
