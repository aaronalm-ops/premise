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

export function getEnvStatus() {
  const vars: EnvVar[] = ENV_VARS.map((key) => ({
    key,
    required: true,
    configured: Boolean(process.env[key] && process.env[key]?.length > 0),
  }));
  return {
    allConfigured: vars.every((v) => v.configured),
    vars,
  };
}

export function requireEnv(key: (typeof ENV_VARS)[number]): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required env var: ${key}. Copy .env.local.example to .env.local and fill it in.`,
    );
  }
  return value;
}
