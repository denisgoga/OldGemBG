import { supabase } from "@/lib/supabase";
import { compressImageFile } from "@/lib/compressImageFile";

/** Must match Supabase Storage bucket id (create in dashboard or run migration SQL). */
export const VIDEO_THUMB_BUCKET =
  import.meta.env.VITE_VIDEO_THUMB_BUCKET ?? "video-thumbnails";

const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif"]);

export function isDataUrlThumbnail(s: string | null | undefined): boolean {
  return !!s && s.startsWith("data:image/");
}

export function isHostedVideoThumbnail(url: string | null | undefined): boolean {
  if (!url || !url.startsWith("http")) return false;
  const base = (import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
  if (!base) return false;
  return url.startsWith(base) && url.includes(`/object/public/${VIDEO_THUMB_BUCKET}/`);
}

/** Returns storage object path for our bucket, or null. */
export function storagePathFromPublicUrl(url: string): string | null {
  const marker = `/object/public/${VIDEO_THUMB_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  try {
    return decodeURIComponent(url.slice(i + marker.length));
  } catch {
    return null;
  }
}

/** Banner creatives in same bucket under `banners/` (matches admin uploads). */
export async function uploadHomepageBannerFile(file: File): Promise<string> {
  const optimized = await compressImageFile(file);
  const rawExt = optimized.name.split(".").pop()?.toLowerCase() ?? "";
  const safeExt = ALLOWED_EXT.has(rawExt) ? rawExt : "jpg";
  const path = `banners/${crypto.randomUUID()}.${safeExt}`;

  const { error } = await supabase.storage
    .from(VIDEO_THUMB_BUCKET)
    .upload(path, optimized, {
      cacheControl: "86400",
      upsert: false,
      contentType: optimized.type || `image/${safeExt === "jpg" ? "jpeg" : safeExt}`,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(VIDEO_THUMB_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadVideoThumbnailFile(file: File): Promise<string> {
  const optimized = await compressImageFile(file);
  const rawExt = optimized.name.split(".").pop()?.toLowerCase() ?? "";
  const safeExt = ALLOWED_EXT.has(rawExt) ? rawExt : "jpg";
  const path = `videos/${crypto.randomUUID()}.${safeExt}`;

  const { error } = await supabase.storage
    .from(VIDEO_THUMB_BUCKET)
    .upload(path, optimized, {
      cacheControl: "31536000",
      upsert: false,
      contentType: optimized.type || `image/${safeExt === "jpg" ? "jpeg" : safeExt}`,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(VIDEO_THUMB_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

const VIDEO_BANNER_EXT = new Set(["mp4", "webm"]);

/** Upload a short video creative for homepage banners (max bucket size applies). */
export async function uploadHomepageBannerVideo(file: File): Promise<string> {
  const rawExt = file.name.split(".").pop()?.toLowerCase() ?? "";
  const safeExt = VIDEO_BANNER_EXT.has(rawExt) ? rawExt : "mp4";
  const path = `banners/videos/${crypto.randomUUID()}.${safeExt}`;

  const { error } = await supabase.storage
    .from(VIDEO_THUMB_BUCKET)
    .upload(path, file, {
      cacheControl: "86400",
      upsert: false,
      contentType: file.type || `video/${safeExt}`,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(VIDEO_THUMB_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Upload a legacy data-URL thumbnail as a file in Storage; returns public URL. */
export async function uploadDataUrlThumbnail(dataUrl: string): Promise<string> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const mime = blob.type || "image/jpeg";
  const ext = mime.includes("png")
    ? "png"
    : mime.includes("webp")
      ? "webp"
      : mime.includes("gif")
        ? "gif"
        : mime.includes("avif")
          ? "avif"
          : "jpg";
  const file = new File([blob], `thumb.${ext}`, { type: mime });
  return uploadVideoThumbnailFile(file);
}

export async function deleteVideoThumbnailAtUrl(
  publicUrl: string | null | undefined,
): Promise<void> {
  if (!publicUrl || !isHostedVideoThumbnail(publicUrl)) return;
  const path = storagePathFromPublicUrl(publicUrl);
  if (!path) return;
  const { error } = await supabase.storage
    .from(VIDEO_THUMB_BUCKET)
    .remove([path]);
  if (error) console.warn("[thumbnail storage] remove:", error.message);
}
