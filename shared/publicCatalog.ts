import type { PublicCatalogResponse } from "./api";
import { mapRowToPublicBanner } from "./bannerSlots.js";
import { getSupabaseServerClient } from "./supabaseServer.js";

export const DEFAULT_CATALOG_PAGE_LIMIT = 9;
const DEFAULT_CACHE_TTL_MS = 60_000;

/** Public site_settings columns only (excludes head_scripts/body_scripts). */
const PUBLIC_SITE_SETTINGS_SELECT =
  "id, meta_title, meta_description, og_image, landing_headline, landing_subhead, seo_intro, footer_text, site_translations, created_at, updated_at";

const PUBLIC_VIDEOS_SELECT =
  "id, title, duration, thumbnail, sort_order, created_at";

type CacheEntry = { body: string; expiresAt: number };
const cache = new Map<string, CacheEntry>();

export function catalogCacheTtlMs(): number {
  const raw = process.env.PUBLIC_CATALOG_CACHE_TTL_MS;
  if (raw === undefined || raw === "") return DEFAULT_CACHE_TTL_MS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_CACHE_TTL_MS;
}

function pruneCatalogCache() {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
}

function queryFlag(value: string | string[] | undefined): boolean {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw !== undefined && raw !== "" && raw !== "0" && raw !== "false";
}

/** Works for Express `req.query` and Vercel `req.query`. */
export function parseCatalogPagination(query: {
  page?: string | string[];
  limit?: string | string[];
  fresh?: string | string[];
  _fresh?: string | string[];
}): {
  page: number;
  limit: number;
  from: number;
  to: number;
  skipCache: boolean;
} {
  const pageRaw = Array.isArray(query.page) ? query.page[0] : query.page;
  const limitRaw = Array.isArray(query.limit) ? query.limit[0] : query.limit;

  const page = Math.max(1, Number.parseInt(String(pageRaw ?? "1"), 10) || 1);
  const limit = Math.min(
    100,
    Math.max(
      1,
      Number.parseInt(String(limitRaw ?? String(DEFAULT_CATALOG_PAGE_LIMIT)), 10) ||
        DEFAULT_CATALOG_PAGE_LIMIT,
    ),
  );
  const offset = (page - 1) * limit;
  const skipCache = queryFlag(query.fresh) || queryFlag(query._fresh);
  return { page, limit, from: offset, to: offset + limit - 1, skipCache };
}

export async function fetchPublicCatalogPayload(
  page: number,
  limit: number,
): Promise<PublicCatalogResponse> {
  const { from, to } = {
    from: (page - 1) * limit,
    to: (page - 1) * limit + limit - 1,
  };

  const supabase = getSupabaseServerClient();

  const [videosRes, settingsRes, bannersRes] = await Promise.all([
    supabase
      .from("videos")
      .select(PUBLIC_VIDEOS_SELECT, { count: "exact" })
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase
      .from("site_settings")
      .select(PUBLIC_SITE_SETTINGS_SELECT)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("homepage_banners")
      .select(
        "id, name, slot, device_visibility, layout_width, image_url, link_url, size, alt_text, media_type, video_url, html_content, sort_order",
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
  ]);

  if (videosRes.error) throw videosRes.error;

  if (bannersRes.error) {
    console.error("[public-catalog] homepage_banners:", bannersRes.error);
  }

  const bannersRaw = bannersRes.error ? [] : (bannersRes.data ?? []);
  const banners = bannersRaw.map((row) =>
    mapRowToPublicBanner(row as Record<string, unknown>),
  );

  return {
    videos: videosRes.data ?? [],
    siteSettings: settingsRes.error ? null : settingsRes.data,
    banners,
    page,
    limit,
    totalCount: videosRes.count ?? 0,
  };
}

/**
 * In-memory cache keyed by page+limit. Separate cache per runtime (Express vs each Vercel lambda instance).
 */
export function invalidateCatalogCache() {
  cache.clear();
}

export async function getOrBuildCatalogJsonBody(
  page: number,
  limit: number,
  opts?: { skipCache?: boolean },
): Promise<{ body: string; cacheHit: boolean }> {
  const key = `${page}:${limit}`;
  const now = Date.now();
  const ttl = catalogCacheTtlMs();

  pruneCatalogCache();
  if (!opts?.skipCache) {
    const hit = cache.get(key);
    if (hit && hit.expiresAt > now) {
      return { body: hit.body, cacheHit: true };
    }
  }

  const payload = await fetchPublicCatalogPayload(page, limit);
  const body = JSON.stringify(payload);
  cache.set(key, { body, expiresAt: now + ttl });
  return { body, cacheHit: false };
}

export function setCatalogCacheControlHeader(setHeader: (n: string, v: string) => void) {
  const maxAge = process.env.PUBLIC_CATALOG_HTTP_MAX_AGE ?? "30";
  const sMaxAge = process.env.PUBLIC_CATALOG_HTTP_S_MAXAGE ?? "120";
  const swr = process.env.PUBLIC_CATALOG_HTTP_STALE_WHILE_REVALIDATE ?? "300";
  setHeader(
    "Cache-Control",
    `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`,
  );
}
