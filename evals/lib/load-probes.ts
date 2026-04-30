import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { AnyProbe, ProbeType } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROBES_DIR = join(__dirname, "..", "probes");

export function loadProbesOfType<T extends AnyProbe>(type: ProbeType): T[] {
  const dir = join(PROBES_DIR, type);
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  return files
    .sort()
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as T);
}
