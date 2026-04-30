"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  email: string | null;
};

export function AccountMenu({ email }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const initials = (email ?? "?")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex size-7 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-muted)] text-[10px] font-semibold text-[var(--color-foreground)] hover:bg-[var(--color-border)]"
        title={email ?? "Account"}
      >
        {initials}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] p-2 text-xs shadow-lg">
          <div className="border-b border-[var(--color-border)] px-2 py-1.5">
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Signed in as
            </p>
            <p className="mt-0.5 truncate font-medium">{email ?? "unknown"}</p>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="mt-1 w-full rounded px-2 py-1.5 text-left text-xs hover:bg-[var(--color-muted)]"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
