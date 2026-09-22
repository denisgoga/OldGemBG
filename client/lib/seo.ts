import { SUPPORTED_LOCALES, type Locale, isSupportedLocale } from "@/i18n/locales";

export function siteOrigin(): string {
  const raw = import.meta.env.VITE_SITE_URL?.trim() || "https://oldgem.net";
  try {
    return new URL(raw.startsWith("http") ? raw : `https://${raw}`).origin;
  } catch {
    return "https://oldgem.net";
  }
}

export function localeToOgLocale(locale: Locale): string {
  switch (locale) {
    case "de":
      return "de_DE";
    case "it":
      return "it_IT";
    case "es":
      return "es_ES";
    case "fr":
      return "fr_FR";
    default:
      return "en_US";
  }
}

/** Strip query/hash and normalize `/en` → `/en/`. */
export function canonicalPathname(pathname: string): string {
  const clean = pathname.split("?")[0].split("#")[0];
  const parts = clean.split("/").filter(Boolean);
  if (parts.length === 0) return "/en/";
  if (parts.length === 1 && isSupportedLocale(parts[0])) {
    return `/${parts[0]}/`;
  }
  return `/${parts.join("/")}`;
}

export function absoluteUrl(pathname: string): string {
  return `${siteOrigin()}${canonicalPathname(pathname)}`;
}

function upsertMeta(
  attr: "name" | "property",
  key: string,
  content: string,
) {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string, extra?: Record<string, string>) {
  const extraSel = extra
    ? Object.entries(extra)
        .map(([k, v]) => `[${k}="${v}"]`)
        .join("")
    : "";
  let el = document.head.querySelector(
    `link[rel="${rel}"]${extraSel}`,
  ) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    if (extra) {
      for (const [k, v] of Object.entries(extra)) el.setAttribute(k, v);
    }
    document.head.appendChild(el);
  }
  el.href = href;
}

function applyHreflang(pathname: string) {
  document.head
    .querySelectorAll('link[rel="alternate"][hreflang]')
    .forEach((node) => node.remove());
  document.head
    .querySelectorAll('meta[property="og:locale:alternate"]')
    .forEach((node) => node.remove());

  const parts = canonicalPathname(pathname).split("/").filter(Boolean);
  const currentIsLocale = parts[0] && isSupportedLocale(parts[0]);
  const rest = currentIsLocale ? parts.slice(1).join("/") : parts.join("/");
  const origin = siteOrigin();

  for (const loc of SUPPORTED_LOCALES) {
    const href = rest ? `${origin}/${loc}/${rest}` : `${origin}/${loc}/`;
    upsertLink("alternate", href, { hreflang: loc });
    if (loc !== (currentIsLocale ? parts[0] : "en")) {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:locale:alternate");
      meta.setAttribute("content", localeToOgLocale(loc));
      document.head.appendChild(meta);
    }
  }
  upsertLink("alternate", rest ? `${origin}/en/${rest}` : `${origin}/en/`, {
    hreflang: "x-default",
  });
}

function patchJsonLd(locale: Locale, description?: string | null) {
  const jsonLdScript = document.querySelector(
    'script[type="application/ld+json"]',
  );
  if (!jsonLdScript?.textContent) return;
  try {
    const json = JSON.parse(jsonLdScript.textContent) as Record<string, unknown>;
    json.inLanguage = locale;
    json.url = siteOrigin();
    if (description) json.description = description;
    jsonLdScript.textContent = JSON.stringify(json);
  } catch {
    /* ignore */
  }
}

export type DocumentSeoInput = {
  title?: string | null;
  description?: string | null;
  locale: Locale;
  image?: string | null;
  /** Defaults to the current path (no query string). */
  pathname?: string;
};

/** Keep title / description / canonical / hreflang in sync for crawlers that run JS. */
export function applyDocumentSeo(input: DocumentSeoInput) {
  const locale = input.locale;
  const pathname = input.pathname ?? window.location.pathname;
  const canonical = absoluteUrl(pathname);

  document.documentElement.lang = locale;

  if (input.title) {
    document.title = input.title;
    upsertMeta("property", "og:title", input.title);
    upsertMeta("name", "twitter:title", input.title);
  }
  if (input.description) {
    upsertMeta("name", "description", input.description);
    upsertMeta("property", "og:description", input.description);
    upsertMeta("name", "twitter:description", input.description);
  }
  if (input.image) {
    upsertMeta("property", "og:image", input.image);
    upsertMeta("name", "twitter:image", input.image);
  }

  upsertLink("canonical", canonical);
  upsertMeta("property", "og:url", canonical);
  upsertMeta("name", "twitter:url", canonical);
  upsertMeta("property", "og:locale", localeToOgLocale(locale));
  applyHreflang(pathname);
  patchJsonLd(locale, input.description);
}
