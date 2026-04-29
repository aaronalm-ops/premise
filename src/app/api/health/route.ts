import { NextResponse } from "next/server";
import { getEnvStatus } from "@/lib/env";

export async function GET() {
  const env = getEnvStatus();
  return NextResponse.json({
    ok: env.allConfigured,
    env,
    timestamp: new Date().toISOString(),
  });
}
