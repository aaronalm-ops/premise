// Exponential-backoff retry for transient API failures.
// Retries 429 (rate limit), 529 (Anthropic overloaded), 5xx server errors.
// Never retries 4xx client errors (other than 429) — those are deterministic.

export type RetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  isRetryable?: (err: unknown) => boolean;
  onRetry?: (attempt: number, err: unknown) => void;
};

const DEFAULT_RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504, 529]);

export function isTransient(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { status?: number; statusCode?: number; name?: string; cause?: { code?: string } };
  const status = e.status ?? e.statusCode;
  if (typeof status === "number" && DEFAULT_RETRYABLE_STATUSES.has(status))
    return true;
  // Network-level errors (DNS, ECONNRESET, fetch failed)
  const code = e.cause?.code;
  if (code && ["ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "ENOTFOUND"].includes(code))
    return true;
  if (e.name === "AbortError") return false;
  return false;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const max = options.maxAttempts ?? 5;
  const base = options.baseDelayMs ?? 500;
  const cap = options.maxDelayMs ?? 30000;
  const retryable = options.isRetryable ?? isTransient;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= max; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === max || !retryable(err)) throw err;
      const delay = Math.min(cap, base * Math.pow(2, attempt - 1));
      // Add jitter to avoid thundering herd
      const jitter = Math.floor(Math.random() * (delay * 0.25));
      options.onRetry?.(attempt, err);
      await sleep(delay + jitter);
    }
  }
  throw lastErr;
}
