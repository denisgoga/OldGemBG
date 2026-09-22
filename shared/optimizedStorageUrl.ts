const OBJECT_PUBLIC = "/storage/v1/object/public/";
const RENDER_PUBLIC = "/storage/v1/render/image/public/";

const SKIP_EXT = [".gif", ".mp4", ".webm", ".m4v"];

export type OptimizedImageOptions = {
  width?: number;
  quality?: number;
};

/**
 * Serve Supabase Storage images through the image renderer.
 * Cuts cached egress (1–2MB originals → ~10–40KB) and adds long CDN cache
 * for files that were uploaded with Cache-Control: no-cache.
 */
export function optimizedStorageImageUrl(
  url: string | null | undefined,
  opts?: OptimizedImageOptions,
): string {
  if (!url) return "";
  if (url.startsWith("data:")) return url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  const pathname = parsed.pathname;
  const isObject = pathname.includes(OBJECT_PUBLIC);
  const isRender = pathname.includes(RENDER_PUBLIC);
  if (!isObject && !isRender) return url;

  const lowerPath = pathname.toLowerCase();
  if (SKIP_EXT.some((ext) => lowerPath.endsWith(ext))) return url;

  if (isObject) {
    parsed.pathname = pathname.replace(OBJECT_PUBLIC, RENDER_PUBLIC);
  }

  parsed.searchParams.set("width", String(opts?.width ?? 640));
  parsed.searchParams.set("quality", String(opts?.quality ?? 70));
  parsed.searchParams.set("format", "webp");
  return parsed.toString();
}
