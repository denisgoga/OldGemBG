import type { PublicHomepageBanner } from "./api";

export const BANNER_DEVICE_VISIBILITY = ["all", "mobile", "desktop"] as const;
export type BannerDeviceVisibility = (typeof BANNER_DEVICE_VISIBILITY)[number];

export const BANNER_LAYOUT_WIDTH = ["auto", "grid", "full"] as const;
export type BannerLayoutWidth = (typeof BANNER_LAYOUT_WIDTH)[number];

export const BANNER_MEDIA_TYPES = ["image", "video", "html"] as const;
export type BannerMediaType = (typeof BANNER_MEDIA_TYPES)[number];

export const BANNER_SIZES = ["native", "300x250", "300x100", "728x90"] as const;
export type BannerSize = (typeof BANNER_SIZES)[number];

export const HOMEPAGE_BANNER_SLOTS = [
  {
    id: "home_below_intro",
    label: "Below intro text",
    hint: "Wide area under headline, subhead, and SEO intro — before the video grid.",
    zone: "intro" as const,
  },
  {
    id: "home_grid_after_3",
    label: "After 3rd video",
    hint: "Inline in the grid (desktop: row 1, column 4) or full-width when HTML / full layout.",
    zone: "grid" as const,
  },
  {
    id: "home_grid_after_6",
    label: "After 6th video",
    hint: "Inline in the grid after the sixth thumbnail.",
    zone: "grid" as const,
  },
  {
    id: "home_grid_after_9",
    label: "After 9th video",
    hint: "Inline in the grid after the ninth thumbnail (end of page).",
    zone: "grid" as const,
  },
  {
    id: "home_below_grid",
    label: "Below video grid",
    hint: "Full-width strip above pagination / footer.",
    zone: "footer" as const,
  },
] as const;

export type HomepageBannerSlotId = (typeof HOMEPAGE_BANNER_SLOTS)[number]["id"];

const SLOT_IDS = new Set<string>(HOMEPAGE_BANNER_SLOTS.map((s) => s.id));

export function isHomepageBannerSlotId(
  value: string,
): value is HomepageBannerSlotId {
  return SLOT_IDS.has(value);
}

export function getBannerSlotMeta(slot: string) {
  return HOMEPAGE_BANNER_SLOTS.find((s) => s.id === slot);
}

export function getBannerSlotLabel(slot: string): string {
  return getBannerSlotMeta(slot)?.label ?? slot;
}

export function getBannerSlotHint(slot: string): string {
  return getBannerSlotMeta(slot)?.hint ?? "";
}

export function deviceVisibilityLabel(v: BannerDeviceVisibility): string {
  switch (v) {
    case "mobile":
      return "Mobile only";
    case "desktop":
      return "Desktop only";
    default:
      return "All devices";
  }
}

/** Tailwind visibility — mobile < md (768px), desktop >= md. Keep off layout flex/col classes (cn merge conflict). */
export function deviceVisibilityClass(v: BannerDeviceVisibility): string {
  switch (v) {
    case "mobile":
      return "block md:hidden";
    case "desktop":
      return "hidden md:block";
    default:
      return "block";
  }
}

export function layoutWidthLabel(v: BannerLayoutWidth): string {
  switch (v) {
    case "grid":
      return "Grid cell (1 slot)";
    case "full":
      return "Full row width";
    default:
      return "Auto (HTML/full, images in cell)";
  }
}

export function bannerUsesFullWidth(
  banner: Pick<PublicHomepageBanner, "media_type" | "layout_width">,
): boolean {
  if (banner.layout_width === "full") return true;
  if (banner.layout_width === "grid") return false;
  return banner.media_type === "html";
}

export function bannerGridColumnClass(
  banner: Pick<PublicHomepageBanner, "media_type" | "layout_width">,
): string {
  if (!bannerUsesFullWidth(banner)) return "";
  return "col-span-1 sm:col-span-2 lg:col-span-4 w-full";
}

export function bannerGridInnerClass(
  banner: Pick<PublicHomepageBanner, "media_type" | "layout_width">,
): string {
  if (!bannerUsesFullWidth(banner)) return "w-full";
  return "flex w-full justify-center";
}

export function bannerHasContent(banner: PublicHomepageBanner): boolean {
  const mediaType = banner.media_type ?? "image";
  if (mediaType === "html") return !!banner.html_content?.trim();
  if (mediaType === "video") return !!banner.video_url?.trim();
  return !!banner.image_url?.trim();
}

function legacySlotFromSortOrder(sortOrder: unknown): HomepageBannerSlotId {
  const n = Number(sortOrder);
  if (n === 1) return "home_grid_after_3";
  if (n === 2) return "home_grid_after_6";
  if (n === 3) return "home_grid_after_9";
  if (n >= 4) return "home_below_grid";
  return "home_below_intro";
}

function parseDeviceVisibility(raw: unknown): BannerDeviceVisibility {
  if (raw === "mobile" || raw === "desktop") return raw;
  return "all";
}

function parseLayoutWidth(raw: unknown): BannerLayoutWidth {
  if (raw === "grid" || raw === "full") return raw;
  return "auto";
}

function parseBannerSize(raw: unknown): BannerSize {
  if (raw === "300x100" || raw === "728x90" || raw === "native") return raw;
  return "300x250";
}

function parseMediaType(raw: unknown): BannerMediaType {
  if (raw === "video" || raw === "html") return raw;
  return "image";
}

function parseSlot(raw: unknown, sortOrder: unknown): HomepageBannerSlotId {
  if (typeof raw === "string" && isHomepageBannerSlotId(raw)) return raw;
  return legacySlotFromSortOrder(sortOrder);
}

/** Normalize a DB/API row into PublicHomepageBanner. */
export function mapRowToPublicBanner(raw: Record<string, unknown>): PublicHomepageBanner {
  const linkRaw = typeof raw.link_url === "string" ? raw.link_url.trim() : "";
  return {
    id: String(raw.id),
    name: typeof raw.name === "string" ? raw.name.trim() : "",
    slot: parseSlot(raw.slot, raw.sort_order),
    device_visibility: parseDeviceVisibility(raw.device_visibility),
    layout_width: parseLayoutWidth(raw.layout_width),
    media_type: parseMediaType(raw.media_type),
    image_url: String(raw.image_url ?? ""),
    video_url:
      typeof raw.video_url === "string" && raw.video_url.trim().length > 0
        ? raw.video_url.trim()
        : null,
    html_content:
      typeof raw.html_content === "string" && raw.html_content.trim().length > 0
        ? raw.html_content
        : null,
    link_url: linkRaw.length > 0 ? linkRaw : null,
    size: parseBannerSize(raw.size),
    alt_text:
      typeof raw.alt_text === "string" && raw.alt_text.trim().length > 0
        ? raw.alt_text.trim()
        : null,
    sort_order:
      typeof raw.sort_order === "number"
        ? raw.sort_order
        : raw.sort_order != null
          ? Number(raw.sort_order)
          : 0,
  };
}

export function bannersForSlot(
  banners: PublicHomepageBanner[],
  slot: HomepageBannerSlotId,
): PublicHomepageBanner[] {
  return banners
    .filter((b) => b.slot === slot && bannerHasContent(b))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}
