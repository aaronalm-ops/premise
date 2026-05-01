"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DocumentRecord } from "@/lib/rag/types";
import { PublicLibrariesSection } from "./public-libraries-section";

type Props = {
  projectId: string;
};

type IngestStatus =
  | { kind: "idle" }
  | { kind: "uploading"; label: string }
  | { kind: "error"; message: string }
  | { kind: "success"; chunks: number; tokens: number; skipped: boolean };

export function DocumentsArtefact({ projectId }: Props) {
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<IngestStatus>({ kind: "idle" });
  const [url, setUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/projects/${projectId}/documents`);
      const data = await r.json();
      setDocs(data.documents ?? []);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const uploadFile = async (file: File) => {
    setStatus({ kind: "uploading", label: `Uploading ${file.name}…` });
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch(`/api/projects/${projectId}/documents`, {
        method: "POST",
        body: form,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `Upload failed (${r.status})`);
      setStatus({
        kind: "success",
        chunks: data.chunkCount ?? 0,
        tokens: data.embeddingTokens ?? 0,
        skipped: data.skippedDuplicate ?? false,
      });
      refresh();
    } catch (err) {
      setStatus({ kind: "error", message: (err as Error).message });
    }
  };

  const ingestUrl = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setStatus({ kind: "uploading", label: `Fetching ${trimmed}…` });
    try {
      const r = await fetch(`/api/projects/${projectId}/documents/url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `Fetch failed (${r.status})`);
      setStatus({
        kind: "success",
        chunks: data.chunkCount ?? 0,
        tokens: data.embeddingTokens ?? 0,
        skipped: data.skippedDuplicate ?? false,
      });
      setUrl("");
      refresh();
    } catch (err) {
      setStatus({ kind: "error", message: (err as Error).message });
    }
  };

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider">
            Corpus
          </h3>
          <span className="text-[10px] text-[var(--color-muted-foreground)]">
            {loading
              ? "loading…"
              : docs.length === 0
                ? "empty"
                : `${docs.length} doc${docs.length === 1 ? "" : "s"}`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.md,.txt,.markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadFile(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={status.kind === "uploading"}
            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-[10px] font-medium uppercase tracking-wider disabled:opacity-40"
          >
            Upload
          </button>
        </div>
      </div>

      <div className="space-y-3 px-4 py-3">
        <PublicLibrariesSection />

        <div className="flex items-center gap-1">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a URL to fetch (article, public report, blog post)"
            disabled={status.kind === "uploading"}
            onKeyDown={(e) => {
              if (e.key === "Enter") ingestUrl();
            }}
            className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-foreground)]/10"
          />
          <button
            type="button"
            onClick={ingestUrl}
            disabled={status.kind === "uploading" || !url.trim()}
            className="rounded-md border border-[var(--color-border)] px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider disabled:opacity-40"
          >
            Fetch
          </button>
        </div>

        {status.kind === "uploading" && (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            <span className="animate-pulse">{status.label}</span>
          </p>
        )}
        {status.kind === "error" && (
          <p className="text-xs text-red-700 dark:text-red-300">
            {status.message}
          </p>
        )}
        {status.kind === "success" && (
          <p className="text-xs text-emerald-700 dark:text-emerald-300">
            {status.skipped
              ? "Already in corpus — skipped duplicate."
              : `Ingested · ${status.chunks} chunks · ${status.tokens.toLocaleString()} tokens.`}
          </p>
        )}

        {docs.length === 0 && !loading && status.kind === "idle" && (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Upload PDF / DOCX / .md / .txt files, or paste a URL. Premise will
            chunk, embed, and store. The hypothesis generator and Q&amp;A
            retrieve from this corpus.
          </p>
        )}

        {docs.length > 0 && (
          <ul className="space-y-1.5">
            {docs.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-1.5 text-xs"
              >
                <div className="min-w-0 flex-1 truncate">
                  <span className="font-medium text-[var(--color-foreground)]">
                    {d.title}
                  </span>
                </div>
                <span className="shrink-0 text-[10px] text-[var(--color-muted-foreground)]">
                  {d.chunk_count ?? 0} chunks
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
