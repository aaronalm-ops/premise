export function ChatPane() {
  return (
    <section className="flex h-full flex-col border-r border-[var(--color-border)]">
      <div className="border-b border-[var(--color-border)] px-6 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
          Conversation
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
          The chat thread will live here. The bot proposes options; the
          researcher selects.
        </div>
      </div>

      <div className="border-t border-[var(--color-border)] px-6 py-4">
        <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-muted-foreground)]">
          <span className="opacity-60">
            Drop a brief or ask a question (Phase 1+)
          </span>
        </div>
      </div>
    </section>
  );
}
