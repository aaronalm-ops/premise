"use client";

import { useEffect, useState } from "react";

type PublicLibrary = {
  id: string;
  name: string;
  description: string | null;
  document_count: number;
  documents: Array<{ id: string; title: string; chunk_count: number }>;
};

export function PublicLibrariesSection() {
  const [libraries, setLibraries] = useState<PublicLibrary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/public-libraries")
      .then((r) => r.json())
      .then((data) => {
        setLibraries(data.libraries ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded || libraries.length === 0) return null;

  const totalDocs = libraries.reduce((s, l) => s + l.document_count, 0);

  return (
    <div className="rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-xs dark:border-sky-900 dark:bg-sky-950/30">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-300">
            Public library
          </span>
          <span className="text-sky-900 dark:text-sky-100">
            {totalDocs} doc{totalDocs === 1 ? "" : "s"} — auto-included in all
            retrievals
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-sky-700 dark:text-sky-300">
          {expanded ? "hide" : "browse"}
        </span>
      </button>
      {expanded && (
        <div className="mt-2 space-y-3 border-t border-sky-300 pt-2 dark:border-sky-900">
          {libraries.map((lib) => (
            <div key={lib.id}>
              <p className="font-semibold text-sky-900 dark:text-sky-100">
                {lib.name}
              </p>
              {lib.description && (
                <p className="mt-0.5 text-sky-800 dark:text-sky-200">
                  {lib.description}
                </p>
              )}
              <ul className="mt-1.5 space-y-0.5">
                {lib.documents.map((d) => (
                  <li
                    key={d.id}
                    className="flex justify-between gap-2 text-[10px] text-sky-800 dark:text-sky-200"
                  >
                    <span className="truncate">{d.title}</span>
                    <span className="shrink-0 opacity-70">
                      {d.chunk_count} chunks
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
