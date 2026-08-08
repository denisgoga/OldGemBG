/**
 * Shared types (and optional pure helpers) for client + server.
 */

/** Mirrors client `Video` / `SiteSettings` for `/api/public/catalog` JSON. */
export type PublicCatalogVideo = {
  id: string;
  title: string;
  duration: string;
  thumbnail: string;
  sort_order: number | null;
  created_at: string;
};

export type PublicCatalogSiteSettings = {
  id: string;
  meta_title: string | null;
  meta_description: string | null;
  og_image: string | null;
  landing_headline: string | null;
  landing_subhead: string | null;
  seo_intro: string | null;
  footer_text: string | null;
  site_translations: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

/** Active homepage grid banners returned from `/api/public/catalog` */
export type PublicHomepageBanner = {
  id: string;
  media_type: "image" | "video" | "html";
  image_url: string;
  video_url: string | null;
  html_content: string | null;
  /** Optional outbound click URL */
  link_url: string | null;
  /** IAB-style slots, or native (matches homepage thumbnail card footprint) */
  size: "300x250" | "300x100" | "native";
  alt_text: string | null;
};

export interface PublicCatalogResponse {
  videos: PublicCatalogVideo[];
  siteSettings: PublicCatalogSiteSettings | null;
  /** Active banners in display order */
  banners: PublicHomepageBanner[];
  /** 1-based page index */
  page: number;
  /** Page size (e.g. 6) */
  limit: number;
  /** Total videos matching sort (all pages) */
  totalCount: number;
}
