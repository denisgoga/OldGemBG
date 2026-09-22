import { describe, expect, it } from "vitest";
import { optimizedStorageImageUrl } from "./optimizedStorageUrl";

const objectUrl =
  "https://kotgrkkoendiqonfgrrf.supabase.co/storage/v1/object/public/video-thumbnails/videos/a.png";

describe("optimizedStorageImageUrl", () => {
  it("rewrites Supabase object URLs to the image renderer", () => {
    const next = optimizedStorageImageUrl(objectUrl);
    expect(next).toContain("/storage/v1/render/image/public/");
    expect(next).toContain("width=640");
    expect(next).toContain("quality=70");
    expect(next).toContain("format=webp");
  });

  it("leaves GIFs and videos untouched", () => {
    expect(
      optimizedStorageImageUrl(objectUrl.replace(".png", ".gif")),
    ).toBe(objectUrl.replace(".png", ".gif"));
    expect(
      optimizedStorageImageUrl(objectUrl.replace(".png", ".mp4")),
    ).toBe(objectUrl.replace(".png", ".mp4"));
  });

  it("leaves external and data URLs untouched", () => {
    expect(optimizedStorageImageUrl("https://cdn.example.com/a.jpg")).toBe(
      "https://cdn.example.com/a.jpg",
    );
    expect(optimizedStorageImageUrl("data:image/png;base64,abc")).toBe(
      "data:image/png;base64,abc",
    );
  });

  it("returns empty string for missing values", () => {
    expect(optimizedStorageImageUrl(null)).toBe("");
    expect(optimizedStorageImageUrl("")).toBe("");
  });
});
