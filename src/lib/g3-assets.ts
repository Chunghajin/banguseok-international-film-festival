import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { posterUrl } from "./tmdb.ts";

export async function g3Font() {
  return readFile(join(process.cwd(), "public/fonts/NanumGothic-Regular.ttf"));
}

export async function g3Poster(path: unknown, fetcher = fetch): Promise<string | null> {
  const url = posterUrl(path);
  if (!url) return null;
  try {
    const response = await fetcher(url, { signal: AbortSignal.timeout(3000), redirect: "error", cache: "no-store" });
    const mime = response.headers.get("content-type")?.split(";")[0];
    if (!response.ok || !mime || !["image/jpeg", "image/png", "image/webp"].includes(mime)) return null;
    const bytes = await response.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > 2 * 1024 * 1024) return null;
    return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
  } catch { return null; }
}
