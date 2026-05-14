"use client";

import { useState, type FormEvent } from "react";
import { getBrowserSupabase } from "@/lib/auth/browser";
import { PremiseMark } from "@/components/canvas/premise-mark";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setErrorMessage(null);

    const supabase = getBrowserSupabase();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
    } else {
      setStatus("sent");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md bg-[var(--color-foreground)]">
            <PremiseMark className="size-5 text-[var(--color-background)]" />
          </div>
          <h1 className="text-base font-semibold tracking-tight">Premise</h1>
        </div>

        <p className="mb-6 text-sm text-[var(--color-muted-foreground)]">
          Sign in with email. We&apos;ll send you a one-time link — no password
          required.
        </p>

        {status === "sent" ? (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100">
            <p className="font-medium">Check your email.</p>
            <p className="mt-1 text-xs">
              We sent a magic link to <strong>{email}</strong>. Click it to
              finish signing in. The link expires in an hour.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Email
              </span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourdomain.com"
                className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-foreground)]/10"
              />
            </label>

            {errorMessage && (
              <p className="text-xs text-red-700 dark:text-red-300">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "sending" || !email.trim()}
              className="w-full rounded-md bg-[var(--color-foreground)] px-4 py-2 text-sm font-medium text-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {status === "sending" ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}

        <p className="mt-8 text-[10px] text-[var(--color-muted-foreground)]">
          Premise — AI co-pilot for market and consumer insights researchers.
        </p>
        <p className="mt-2 text-[10px] text-[var(--color-muted-foreground)]">
          Not ready to sign in?{" "}
          <a
            href="/cost-calculator"
            className="underline hover:text-[var(--color-foreground)]"
          >
            See what one study costs to run
          </a>
          .
        </p>
      </div>
    </div>
  );
}
