const MAX_EDGE_PX = 960;
const JPEG_QUALITY = 0.82;

/** Resize/compress raster images before Storage upload to cut cached egress. */
export async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type.includes("gif")) {
    return file;
  }

  if (file.size <= 180_000) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY);
  });

  if (!blob || blob.size >= file.size) {
    return file;
  }

  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}
