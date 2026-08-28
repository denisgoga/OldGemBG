import type { PublicCatalogResponse } from "@shared/api";

export function buildCatalogFetchUrl(
  base: string,
  page: number,
  limit: number,
  opts?: { bypassCache?: boolean },
): string {
  const bypass = opts?.bypassCache === true;
  if (base.startsWith("http://") || base.startsWith("https://")) {
    const u = new URL(base);
    u.searchParams.set("page", String(page));
    u.searchParams.set("limit", String(limit));
    if (bypass) u.searchParams.set("_fresh", String(Date.now()));
    return u.toString();
  }
  const [path, qs] = base.includes("?") ? base.split("?", 2) : [base, ""];
  const params = new URLSearchParams(qs);
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (bypass) params.set("_fresh", String(Date.now()));
  return `${path}?${params.toString()}`;
}

function parseClientCatalogCacheTtlMs(): number {
  const raw = import.meta.env.VITE_PUBLIC_CATALOG_CLIENT_CACHE_MS;
  if (raw !== undefined && raw !== "") {
    const n = Number.parseInt(String(raw), 10);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 60_000;
}

export function clearPublicCatalogClientCache() {
  memory.clear();
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(SS_PREFIX)) sessionStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

type Cached = { data: PublicCatalogResponse; expiresAt: number };
const memory = new Map<string, Cached>();
const inflight = new Map<string, Promise<PublicCatalogResponse>>();

const SS_PREFIX = "og-catalog:v1:";

function sessionStorageKey(url: string) {
  return `${SS_PREFIX}${url}`;
}

function readSession(url: string): PublicCatalogResponse | null {
  try {
    const raw = sessionStorage.getItem(sessionStorageKey(url));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      exp: number;
      data: PublicCatalogResponse;
    };
    if (parsed.exp <= Date.now()) {
      sessionStorage.removeItem(sessionStorageKey(url));
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeSession(url: string, data: PublicCatalogResponse, ttlMs: number) {
  try {
    sessionStorage.setItem(
      sessionStorageKey(url),
      JSON.stringify({ exp: Date.now() + ttlMs, data }),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export type FetchPublicCatalogOptions = {
  signal?: AbortSignal;
  /** Skip memory/session cache (still shares in-flight requests by URL). */
  bypassCache?: boolean;
};

/**
 * Fetches `/api/public/catalog` with in-flight deduplication and a short TTL cache
 * to cut duplicate edge requests (pagination, remounts, overlapping triggers).
 */
export async function fetchPublicCatalogPage(
  catalogBaseUrl: string,
  page: number,
  limit: number,
  opts?: FetchPublicCatalogOptions,
): Promise<PublicCatalogResponse> {
  const bypass = opts?.bypassCache === true;
  const url = buildCatalogFetchUrl(catalogBaseUrl, page, limit, {
    bypassCache: bypass,
  });
  const ttlMs = parseClientCatalogCacheTtlMs();
  const now = Date.now();

  if (!bypass && ttlMs > 0) {
    const memHit = memory.get(url);
    if (memHit && memHit.expiresAt > now) {
      return memHit.data;
    }
    const ssHit = readSession(url);
    if (ssHit) {
      memory.set(url, { data: ssHit, expiresAt: now + ttlMs });
      return ssHit;
    }
  }

  let p = inflight.get(url);
  if (!p) {
    p = (async () => {
      const res = await fetch(url, {
        signal: opts?.signal,
        cache: bypass ? "no-store" : "default",
      });
      if (!res.ok) {
        throw new Error(`catalog_http_${res.status}`);
      }
      const data = (await res.json()) as PublicCatalogResponse;
      if (ttlMs > 0) {
        const expiresAt = Date.now() + ttlMs;
        memory.set(url, { data, expiresAt });
        writeSession(url, data, ttlMs);
      }
      return data;
    })().finally(() => {
      inflight.delete(url);
    });
    inflight.set(url, p);
  }

  return p;
}
