export function ProjectSwitcher() {
  return (
    <button
      type="button"
      className="flex items-center gap-2 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
    >
      <span className="size-2 rounded-full bg-[var(--color-muted-foreground)]" />
      No project selected
      <span className="opacity-60">+</span>
    </button>
  );
}
