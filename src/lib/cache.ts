import { createHash } from "crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "fs";
import { join } from "path";

const CACHE_DIR = join(process.cwd(), ".cache");
const TTL_MS = 24 * 60 * 60 * 1000;

function ensureCacheDir() {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
}

function hashKey(...parts: string[]): string {
  return createHash("sha256").update(parts.join(":")).digest("hex").slice(0, 24);
}

export function getCached<T>(key: string): { data: T; age: number } | null {
  ensureCacheDir();
  const path = join(CACHE_DIR, `${key}.json`);
  if (!existsSync(path)) return null;
  try {
    const stat = statSync(path);
    const age = Date.now() - stat.mtimeMs;
    if (age > TTL_MS) return null;
    return { data: JSON.parse(readFileSync(path, "utf-8")), age };
  } catch { return null; }
}

export function setCache(key: string, data: unknown): void {
  ensureCacheDir();
  writeFileSync(join(CACHE_DIR, `${key}.json`), JSON.stringify(data));
}

export function crawlCacheKey(url: string, depth: number): string {
  return hashKey("crawl", url, String(depth));
}

export function analysisCacheKey(rawHtml: string): string {
  return hashKey("analysis", rawHtml);
}
