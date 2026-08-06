import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AccessModal } from "@/components/AccessModal";
import {
  VideoCard,
  THUMBNAIL_WARMUP_BEFORE_MODAL_MS,
} from "@/components/VideoCard";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  supabase,
  type Video,
  type SiteSettings,
  type PopupSettings,
} from "@/lib/supabase";
import { pickAffiliateUrl } from "@/lib/pickAffiliateUrl";
import type { PublicHomepageBanner } from "@shared/api";
import { HomepageBannerAd } from "@/components/HomepageBannerAd";
import { useLocale } from "@/i18n/LocaleContext";
import { t } from "@/i18n/dictionary";
import {
  getPopupStringsForLocale,
  getSiteStringsForLocale,
} from "@/i18n/dbTranslation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchPublicCatalogPage } from "@/lib/fetchPublicCatalog";

const catalogUrl =
  import.meta.env.VITE_PUBLIC_CATALOG_URL?.trim() || "/api/public/catalog";

/** Items per page (must match default limit on `/api/public/catalog`). */
const PAGE_SIZE = 6;

const VIDEO_QUERY_TIMEOUT_MS = 25_000;

/** Debounce burst Postgres realtime events into a single catalog refetch. */
const REALTIME_CATALOG_DEBOUNCE_MS = 450;

function mapRowsToPublicBanners(rows: unknown[] | null): PublicHomepageBanner[] {
  if (!rows?.length) return [];
  return rows.map((raw) => {
    const row = raw as Record<string, unknown>;
    const linkRaw = typeof row.link_url === "string" ? row.link_url.trim() : "";
    return {
      id: String(row.id),
      image_url: String(row.image_url ?? ""),
      link_url: linkRaw.length > 0 ? linkRaw : null,
      size:
        row.size === "300x100"
          ? "300x100"
          : row.size === "native"
            ? "native"
            : "300x250",
      alt_text:
        typeof row.alt_text === "string" && row.alt_text.trim().length > 0
          ? row.alt_text.trim()
          : null,
    };
  });
}

/** After every third video thumbnail, inserts one rotating banner slot. */
function buildCatalogGridSlots(
  videoList: Video[],
  bannerList: PublicHomepageBanner[],
): Array<
  | { kind: "video"; video: Video }
  | {
      kind: "banner";
      banner: PublicHomepageBanner;
      /** Stable key suffix within the grid */
      key: string;
    }
> {
  const slots = bannerList.filter((b) => b.image_url?.trim());
  if (slots.length === 0) {
    return videoList.map((video) => ({ kind: "video" as const, video }));
  }
  let bannerTurn = 0;
  const out: Array<
    | { kind: "video"; video: Video }
    | { kind: "banner"; banner: PublicHomepageBanner; key: string }
  > = [];
  videoList.forEach((video, idx) => {
    out.push({ kind: "video", video });
    if ((idx + 1) % 3 !== 0) return;
    const banner = slots[bannerTurn % slots.length];
    bannerTurn += 1;
    out.push({
      kind: "banner",
      banner,
      key: `after-${idx + 1}-${banner.id}-${bannerTurn}`,
    });
  });
  return out;
}

function withTimeout<T>(promiseLike: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("timeout")), ms);
    Promise.resolve(promiseLike).then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      },
    );
  });
}

export default function Index() {
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [videos, setVideos] = useState<Video[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [homepageBanners, setHomepageBanners] = useState<PublicHomepageBanner[]>(
    [],
  );
  const [ready, setReady] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Video | null>(null);
  const [warmingVideoId, setWarmingVideoId] = useState<string | null>(null);
  const [directLinkWaitingVideoId, setDirectLinkWaitingVideoId] = useState<
    string | null
  >(null);
  const [popupSettings, setPopupSettings] = useState<PopupSettings | null>(
    null,
  );
  const thumbnailWarmupTimerRef = useRef<number | null>(null);
  const popupSettingsRef = useRef(popupSettings);
  popupSettingsRef.current = popupSettings;
  const [activeFooterDialog, setActiveFooterDialog] = useState<
    "terms" | "privacy" | "contact" | null
  >(null);
  const locale = useLocale();

  const pageRef = useRef(page);
  pageRef.current = page;

  const realtimeCatalogRefreshTimerRef = useRef<number | null>(null);

  const clearThumbnailWarmupState = () => {
    const id = thumbnailWarmupTimerRef.current;
    if (id !== null) {
      window.clearTimeout(id);
      thumbnailWarmupTimerRef.current = null;
    }
    setWarmingVideoId(null);
    setDirectLinkWaitingVideoId(null);
  };

  const openAffiliateLink = () => {
    const url = pickAffiliateUrl(popupSettingsRef.current);
    if (url) window.open(url, "_blank");
  };

  const handleThumbnailClick = (video: Video) => {
    if (directLinkWaitingVideoId === video.id) {
      openAffiliateLink();
      return;
    }
    scheduleAccessModalFromThumbnail(video);
  };

  const scheduleAccessModalFromThumbnail = (video: Video) => {
    const id = thumbnailWarmupTimerRef.current;
    if (id !== null) {
      window.clearTimeout(id);
      thumbnailWarmupTimerRef.current = null;
    }
    setDirectLinkWaitingVideoId(null);
    setWarmingVideoId(video.id);
    thumbnailWarmupTimerRef.current = window.setTimeout(() => {
      thumbnailWarmupTimerRef.current = null;
      const settings = popupSettingsRef.current;
      if (settings?.hide_popup) {
        openAffiliateLink();
        setDirectLinkWaitingVideoId(video.id);
        return;
      }
      setWarmingVideoId(null);
      setSelectedItem(video);
      setAccessModalOpen(true);
    }, THUMBNAIL_WARMUP_BEFORE_MODAL_MS);
  };

  useEffect(() => {
    const fetchPopupSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("popup_settings")
          .select("*")
          .limit(1)
          .single();
        if (error) throw error;
        setPopupSettings(data);
      } catch (error) {
        console.error("Error fetching popup settings:", error);
      }
    };

    void fetchPopupSettings();

    const channel = supabase
      .channel("index-popup-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "popup_settings" },
        (payload) => {
          setPopupSettings(payload.new as PopupSettings);
        },
      )
      .subscribe();

    return () => {
      const id = thumbnailWarmupTimerRef.current;
      if (id !== null) window.clearTimeout(id);
      void channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    clearThumbnailWarmupState();
  }, [page]);

  useEffect(() => {
    if (!warmingVideoId) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-video-warmup-card]")) return;
      clearThumbnailWarmupState();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [warmingVideoId]);

  const loadCatalogPageRef = useRef<
    (pageNum: number, opts?: { bypassCache?: boolean }) => Promise<void>
  >(async () => {});

  loadCatalogPageRef.current = async (
    pageNum: number,
    opts?: { bypassCache?: boolean },
  ) => {
    let loadedFromApi = false;
    if (import.meta.env.VITE_DISABLE_CATALOG_API !== "true") {
      try {
        const catalog = await withTimeout(
          fetchPublicCatalogPage(catalogUrl, pageNum, PAGE_SIZE, {
            bypassCache: opts?.bypassCache,
          }),
          VIDEO_QUERY_TIMEOUT_MS,
        );
        setVideos(catalog.videos as Video[]);
        setTotalCount(catalog.totalCount);
        setSiteSettings(
          (catalog.siteSettings as SiteSettings | null) ?? null,
        );
        setHomepageBanners(Array.isArray(catalog.banners) ? catalog.banners : []);
        loadedFromApi = true;
      } catch {
        // Supabase fallback
      }
    }

    if (!loadedFromApi) {
      const from = (pageNum - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const [vRes, sRes, bRes] = await Promise.all([
        withTimeout(
          supabase
            .from("videos")
            .select("id, title, duration, thumbnail, sort_order, created_at", {
              count: "exact",
            })
            .order("sort_order", { ascending: true, nullsFirst: false })
            .order("created_at", { ascending: false })
            .range(from, to),
          VIDEO_QUERY_TIMEOUT_MS,
        ),
        supabase
          .from("site_settings")
          .select(
            "id, meta_title, meta_description, og_image, landing_headline, landing_subhead, seo_intro, footer_text, site_translations, created_at, updated_at",
          )
          .limit(1)
          .maybeSingle(),
        supabase
          .from("homepage_banners")
          .select("id, image_url, link_url, size, alt_text")
          .eq("is_active", true)
          .order("sort_order", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: true }),
      ]);

      if (vRes.error) {
        console.error("Supabase error details:", {
          message: vRes.error.message,
          code: vRes.error.code,
        });
        throw vRes.error;
      }

      setVideos(vRes.data || []);
      setTotalCount(vRes.count ?? 0);
      setSiteSettings(
        sRes.error ? null : (sRes.data as SiteSettings | null),
      );
      setHomepageBanners(
        bRes.error ? [] : mapRowsToPublicBanners(bRes.data ?? []),
      );
    }
  };

  const scheduleRealtimeCatalogRefresh = useCallback(() => {
    const prev = realtimeCatalogRefreshTimerRef.current;
    if (prev !== null) window.clearTimeout(prev);
    realtimeCatalogRefreshTimerRef.current = window.setTimeout(() => {
      realtimeCatalogRefreshTimerRef.current = null;
      void (async () => {
        try {
          await loadCatalogPageRef.current(pageRef.current);
        } catch {
          /* ignore realtime refresh errors */
        }
      })();
    }, REALTIME_CATALOG_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadError(false);
      setListLoading(true);
      try {
        await loadCatalogPageRef.current(page);
        if (cancelled) return;
        setReady(true);
        setLoadError(false);
      } catch (error) {
        if (cancelled) return;
        console.error(
          "Error fetching videos:",
          error instanceof Error ? error.message : error,
        );
        setLoadError(true);
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, retryTick]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    if (page > totalPages) setPage(totalPages);
  }, [totalCount, page]);

  useEffect(() => {
    if (import.meta.env.VITE_ENABLE_VIDEO_REALTIME !== "true") return;

    const topic =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `videos-feed-${crypto.randomUUID()}`
        : `videos-feed-${Date.now()}`;

    const channel = supabase
      .channel(topic)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "videos" },
        () => {
          scheduleRealtimeCatalogRefresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "homepage_banners" },
        () => {
          scheduleRealtimeCatalogRefresh();
        },
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
      const id = realtimeCatalogRefreshTimerRef.current;
      if (id !== null) window.clearTimeout(id);
      realtimeCatalogRefreshTimerRef.current = null;
    };
  }, [scheduleRealtimeCatalogRefresh]);

  // Apply SEO meta from site_settings (title, description, OG, Twitter – for crawlers that run JS)
  useEffect(() => {
    if (!siteSettings) return;

    // Keep language indicators in sync with selected locale.
    document.documentElement.lang = locale;
    const ogLocale =
      locale === "en"
        ? "en_US"
        : locale === "de"
          ? "de_DE"
          : locale === "it"
            ? "it_IT"
            : locale === "es"
              ? "es_ES"
              : "fr_FR";

    const ogLocaleMeta = document.querySelector(
      'meta[property="og:locale"]',
    ) as HTMLMetaElement | null;
    if (ogLocaleMeta) ogLocaleMeta.content = ogLocale;

    // Keep canonical/URL indicators in sync with the locale-prefixed path.
    const currentUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    const canonicalLink = document.querySelector(
      'link[rel="canonical"]',
    ) as HTMLLinkElement | null;
    if (canonicalLink) canonicalLink.href = currentUrl;

    const ogUrlMeta = document.querySelector(
      'meta[property="og:url"]',
    ) as HTMLMetaElement | null;
    if (ogUrlMeta) ogUrlMeta.content = currentUrl;

    const twitterUrlMeta = document.querySelector(
      'meta[name="twitter:url"]',
    ) as HTMLMetaElement | null;
    if (twitterUrlMeta) twitterUrlMeta.content = currentUrl;

    // Best-effort: update JSON-LD language for crawlers.
    const jsonLdScript = document.querySelector(
      'script[type="application/ld+json"]',
    );
    if (jsonLdScript && jsonLdScript.textContent) {
      try {
        const json = JSON.parse(jsonLdScript.textContent);
        if (typeof json === "object" && json !== null) {
          json.inLanguage = locale;
          json.url = currentUrl;
          jsonLdScript.textContent = JSON.stringify(json);
        }
      } catch {
        // ignore JSON parse errors
      }
    }

    const { meta_title, meta_description } = getSiteStringsForLocale(
      siteSettings,
      locale,
    );
    const setMeta = (selector: string, attr: string, value: string) => {
      const el = document.querySelector(selector);
      if (el && value) el.setAttribute(attr, value);
    };
    if (meta_title) {
      document.title = meta_title;
      setMeta('meta[property="og:title"]', "content", meta_title);
      setMeta('meta[name="twitter:title"]', "content", meta_title);
    }
    if (meta_description) {
      setMeta('meta[name="description"]', "content", meta_description);
      setMeta('meta[property="og:description"]', "content", meta_description);
      setMeta('meta[name="twitter:description"]', "content", meta_description);
    }
    if (siteSettings.og_image) {
      setMeta('meta[property="og:image"]', "content", siteSettings.og_image);
      setMeta('meta[name="twitter:image"]', "content", siteSettings.og_image);
    }
  }, [siteSettings, locale]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
        <div className="max-w-md w-full text-center space-y-6 border border-border rounded-xl p-8 bg-card shadow-lg">
          <div className="flex justify-center">
            <Logo onNavigateHome={() => setPage(1)} />
          </div>
          <p className="text-muted-foreground leading-relaxed">
            {t(locale, "common.loadError")}
          </p>
          <button
            type="button"
            className="btn-gradient text-white font-semibold px-8 py-3 rounded-lg transition-all hover:opacity-90 w-full sm:w-auto"
            onClick={() => setRetryTick((n) => n + 1)}
          >
            {t(locale, "common.retry")}
          </button>
        </div>
      </div>
    );
  }

  if (!ready && !loadError) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-background sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between gap-4">
            <Logo onNavigateHome={() => setPage(1)} />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
          <div className="mb-8 space-y-3 max-w-2xl">
            <Skeleton className="h-8 w-3/5 max-w-md" />
            <Skeleton className="h-4 w-full max-w-lg" />
            <Skeleton className="h-20 w-full max-w-xl rounded-lg" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border overflow-hidden bg-card">
                <Skeleton className="aspect-video w-full rounded-none" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </main>
        <p className="text-center text-sm text-muted-foreground pb-8">
          {t(locale, "common.loading")}
        </p>
      </div>
    );
  }

  const siteStrings = getSiteStringsForLocale(siteSettings, locale);
  const headline =
    siteStrings.landing_headline || t(locale, "index.featuredContent");
  const subhead =
    siteStrings.landing_subhead || t(locale, "index.browsePremium");
  const footerText =
    siteStrings.footer_text || t(locale, "index.footerAdultsOnly");
  const seoIntro = siteStrings.seo_intro || null;
  const hideHeadline = siteStrings.hide_landing_headline;
  const hideSubhead = siteStrings.hide_landing_subhead;
  const hideSeoIntro = siteStrings.hide_seo_intro;
  const footerDialogContent = {
    terms: {
      title: "Terms of Service",
      description:
        "This website contains adult-oriented content and is strictly for users 18+ (or legal age in your jurisdiction). By accessing OldGem.Net, you confirm legal eligibility, agree not to share access with minors, and accept that content availability may change without notice.",
    },
    privacy: {
      title: "Privacy Policy",
      description:
        "OldGem.Net is an adult website. We process limited technical data required for service delivery, fraud prevention, and security. We do not knowingly collect data from minors, and access is intended only for adults of legal age.",
    },
    contact: {
      title: "Contact",
      description: "Email us at info@oldgem.net for support, legal, or policy inquiries.",
    },
  } as const;
  const currentFooterDialog = activeFooterDialog
    ? footerDialogContent[activeFooterDialog]
    : null;

  const popupStrings = getPopupStringsForLocale(popupSettings, locale);
  const directLinkHint =
    popupStrings.direct_link_hint?.trim() ||
    "Almost there - finish signup to watch.";

  return (
    <>
      <AccessModal
        isOpen={accessModalOpen}
        onClose={() => {
          clearThumbnailWarmupState();
          setAccessModalOpen(false);
          setSelectedItem(null);
        }}
        selectedItem={selectedItem}
      />

      <div className="min-h-screen">
        {/* Header */}
        <header className="border-b border-border bg-background sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between gap-4">
            <Logo onNavigateHome={() => setPage(1)} />
            <LanguageSwitcher />
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="mb-8">
            {!hideHeadline && <h1 className="text-2xl font-bold mb-2">{headline}</h1>}
            {!hideSubhead && (
              <p className="text-muted-foreground mb-6">{subhead}</p>
            )}
            {!hideSeoIntro && (
              <section
                className="text-sm text-muted-foreground max-w-2xl"
                aria-label={t(locale, "index.howItWorks")}
              >
                <p>{seoIntro || t(locale, "index.seoIntroDefault")}</p>
              </section>
            )}
          </div>

          {videos.length > 0 ? (
            <>
              <div
                className={cn(
                  "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity",
                  listLoading && "opacity-60 pointer-events-none",
                )}
                aria-busy={listLoading}
              >
                {buildCatalogGridSlots(videos, homepageBanners).map((slot) =>
                  slot.kind === "video" ? (
                    <VideoCard
                      key={slot.video.id}
                      video={slot.video}
                      isWarmupPlaying={warmingVideoId === slot.video.id}
                      isDirectLinkWaiting={
                        directLinkWaitingVideoId === slot.video.id
                      }
                      warmupHint={
                        directLinkWaitingVideoId === slot.video.id
                          ? directLinkHint
                          : t(locale, "index.thumbnailWarmupHint")
                      }
                      onClick={() => handleThumbnailClick(slot.video)}
                    />
                  ) : (
                    <aside key={slot.key} aria-label="Advertisement">
                      <HomepageBannerAd banner={slot.banner} />
                    </aside>
                  ),
                )}
              </div>

              {totalCount > PAGE_SIZE && (
                <nav
                  className="mt-10 flex flex-wrap items-center justify-center gap-4"
                  aria-label={t(locale, "index.paginationPageOf", {
                    current: page,
                    total: totalPages,
                  })}
                >
                  <button
                    type="button"
                    disabled={page <= 1 || listLoading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-sm font-medium disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <ChevronLeft className="w-4 h-4" aria-hidden />
                    {t(locale, "index.prevPage")}
                  </button>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {t(locale, "index.paginationPageOf", {
                      current: page,
                      total: totalPages,
                    })}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages || listLoading}
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-sm font-medium disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {t(locale, "index.nextPage")}
                    <ChevronRight className="w-4 h-4" aria-hidden />
                  </button>
                </nav>
              )}
            </>
          ) : totalCount === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {t(locale, "index.noContentYet")}
              </p>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {t(locale, "index.pageEmpty")}
              </p>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-border bg-secondary/50 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center gap-6 pb-4 text-primary">
              <button
                type="button"
                className="text-sm font-medium transition-opacity hover:opacity-80"
                onClick={() => setActiveFooterDialog("terms")}
              >
                Terms of Service
              </button>
              <button
                type="button"
                className="text-sm font-medium transition-opacity hover:opacity-80"
                onClick={() => setActiveFooterDialog("privacy")}
              >
                Privacy Policy
              </button>
              <button
                type="button"
                className="text-sm font-medium transition-opacity hover:opacity-80"
                onClick={() => setActiveFooterDialog("contact")}
              >
                Contact
              </button>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {t(locale, "index.footerCopyright", {
                year: new Date().getFullYear(),
              })}
            </p>
            {footerText && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                {footerText}
              </p>
            )}
          </div>
        </footer>
      </div>

      <Dialog
        open={activeFooterDialog !== null}
        onOpenChange={(open) => !open && setActiveFooterDialog(null)}
      >
        <DialogContent className="border-border bg-card text-white">
          <DialogHeader>
            <DialogTitle>{currentFooterDialog?.title}</DialogTitle>
            <DialogDescription className="text-gray-300">
              {activeFooterDialog === "contact" ? (
                <>
                  Email us at{" "}
                  <a
                    href="mailto:info@oldgem.net"
                    className="text-primary underline underline-offset-4 hover:opacity-80"
                  >
                    info@oldgem.net
                  </a>
                  {" "}for support, legal, or policy inquiries.
                </>
              ) : (
                currentFooterDialog?.description
              )}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
