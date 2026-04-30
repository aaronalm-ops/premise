type EnvVar = {
  key: string;
  required: boolean;
  configured: boolean;
};

const ENV_VARS = [
  "ANTHROPIC_API_KEY",
  "VOYAGE_API_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

function read(key: string): string | undefined {
  const raw = process.env[key];
  if (raw === undefined) return undefined;
  // Defensive trim — a trailing newline from a pasted value is the #1 source
  // of "Invalid path specified in request URL" type errors downstream.
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getEnvStatus() {
  const vars: EnvVar[] = ENV_VARS.map((key) => ({
    key,
    required: true,
    configured: read(key) !== undefined,
  }));
  return {
    allConfigured: vars.every((v) => v.configured),
    vars,
  };
}

export function requireEnv(key: (typeof ENV_VARS)[number]): string {
  const value = read(key);
  if (!value) {
    throw new Error(
      `Missing required env var: ${key}. Copy .env.local.example to .env.local and fill it in.`,
    );
  }
  return value;
}
