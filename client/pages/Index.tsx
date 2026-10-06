import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
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
import { BannerSlot } from "@/components/BannerSlot";
import { buildHomepageBannerLayout } from "@shared/bannerLayout";
import { mapRowToPublicBanner } from "@shared/bannerSlots";
import { useLocale } from "@/i18n/LocaleContext";
import { t } from "@/i18n/dictionary";
import {
  getPopupStringsForLocale,
  getSiteStringsForLocale,
} from "@/i18n/dbTranslation";
import { fetchPublicCatalogPage } from "@/lib/fetchPublicCatalog";
import { getContactEmail } from "@/lib/legal-config";
import { legalPath } from "@/lib/legalPaths";
import { optimizedStorageImageUrl } from "@shared/optimizedStorageUrl";
import { applyPopunderSettingsFromRow } from "@/lib/sitePopunder";
import { refreshManagedScriptsFromRow } from "@/lib/siteManagedScriptsBoot";
import { applyDocumentSeo } from "@/lib/seo";

const catalogUrl =
  import.meta.env.VITE_PUBLIC_CATALOG_URL?.trim() || "/api/public/catalog";

/** Items per page (must match default limit on `/api/public/catalog`). */
const PAGE_SIZE = 9;

const VIDEO_QUERY_TIMEOUT_MS = 25_000;

function mapRowsToPublicBanners(rows: unknown[] | null): PublicHomepageBanner[] {
  if (!rows?.length) return [];
  return rows.map((raw) =>
    mapRowToPublicBanner(raw as Record<string, unknown>),
  );
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
  const locale = useLocale();
  const contactEmail = getContactEmail();

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
    return () => {
      const id = thumbnailWarmupTimerRef.current;
      if (id !== null) window.clearTimeout(id);
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

  const loadCatalogPageRef = useRef<(pageNum: number) => Promise<void>>(
    async () => {},
  );

  loadCatalogPageRef.current = async (pageNum: number) => {
    let loadedFromApi = false;
    if (import.meta.env.VITE_DISABLE_CATALOG_API !== "true") {
      try {
        const catalog = await withTimeout(
          fetchPublicCatalogPage(catalogUrl, pageNum, PAGE_SIZE),
          VIDEO_QUERY_TIMEOUT_MS,
        );
        setVideos(catalog.videos as Video[]);
        setTotalCount(catalog.totalCount);
        setSiteSettings(
          (catalog.siteSettings as SiteSettings | null) ?? null,
        );
        setHomepageBanners(Array.isArray(catalog.banners) ? catalog.banners : []);
        if (catalog.popupSettings) {
          setPopupSettings(catalog.popupSettings as PopupSettings);
        }
        if (catalog.siteSettings) {
          applyPopunderSettingsFromRow(catalog.siteSettings);
          void refreshManagedScriptsFromRow(catalog.siteSettings);
        }
        loadedFromApi = true;
      } catch {
        // Supabase fallback
      }
    }

    if (!loadedFromApi) {
      const from = (pageNum - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const [vRes, sRes, bRes, pRes] = await Promise.all([
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
          .select(
            "id, name, slot, device_visibility, layout_width, image_url, link_url, size, alt_text, media_type, video_url, html_content, sort_order",
          )
          .eq("is_active", true)
          .order("sort_order", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: true }),
        supabase.from("popup_settings").select("*").limit(1).maybeSingle(),
      ]);

      if (vRes.error) {
        console.error("Supabase error details:", {
          message: vRes.error.message,
          code: vRes.error.code,
        });
        throw vRes.error;
      }

      setVideos(
        (vRes.data || []).map((video) => ({
          ...video,
          thumbnail: optimizedStorageImageUrl(video.thumbnail, { width: 640 }),
        })),
      );
      setTotalCount(vRes.count ?? 0);
      setSiteSettings(
        sRes.error ? null : (sRes.data as SiteSettings | null),
      );
      setHomepageBanners(
        bRes.error
          ? []
          : mapRowsToPublicBanners(bRes.data ?? []).map((banner) => ({
              ...banner,
              image_url: optimizedStorageImageUrl(banner.image_url, {
                width: 960,
              }),
            })),
      );
      if (!pRes.error && pRes.data) {
        setPopupSettings(pRes.data as PopupSettings);
      }
    }
  };

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

  // Apply SEO meta from site_settings (title, description, OG, Twitter – for crawlers that run JS)
  useEffect(() => {
    const { meta_title, meta_description } = getSiteStringsForLocale(
      siteSettings,
      locale,
    );
    applyDocumentSeo({
      title: meta_title,
      description: meta_description,
      locale,
      image: siteSettings?.og_image,
      pathname: `/${locale}/`,
    });
  }, [siteSettings, locale]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const catalogLayout = buildHomepageBannerLayout(videos, homepageBanners);

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-64 w-full rounded-lg border border-border"
              />
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
        popupSettings={popupSettings}
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
            {hideHeadline ? (
              <h1 className="sr-only">{headline}</h1>
            ) : (
              <h1 className="text-2xl font-bold mb-2">{headline}</h1>
            )}
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

          {catalogLayout.introBanners.length > 0 ? (
            <div className="mb-8 flex w-full flex-col items-start gap-4">
              {catalogLayout.introBanners.map((banner) => (
                <BannerSlot
                  key={banner.id}
                  banner={banner}
                  variant="intro"
                />
              ))}
            </div>
          ) : null}

          {videos.length > 0 ? (
            <>
              <div
                className={cn(
                  "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 transition-opacity",
                  listLoading && "opacity-60 pointer-events-none",
                )}
                aria-busy={listLoading}
              >
                {catalogLayout.gridSlots.map((slot) =>
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
                    <BannerSlot
                      key={slot.key}
                      banner={slot.banner}
                      variant="grid"
                    />
                  ),
                )}
              </div>

              {catalogLayout.belowGridBanners.length > 0 ? (
                <div className="mt-8 flex w-full flex-col items-center gap-4">
                  {catalogLayout.belowGridBanners.map((banner) => (
                    <BannerSlot
                      key={banner.id}
                      banner={banner}
                      variant="footer"
                    />
                  ))}
                </div>
              ) : null}

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
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pb-4 text-primary">
              <Link
                to={legalPath(locale, "terms")}
                className="text-sm font-medium transition-opacity hover:opacity-80"
              >
                Terms of Service
              </Link>
              <Link
                to={legalPath(locale, "privacy")}
                className="text-sm font-medium transition-opacity hover:opacity-80"
              >
                Privacy Policy
              </Link>
              <Link
                to={legalPath(locale, "dmca")}
                className="text-sm font-medium transition-opacity hover:opacity-80"
              >
                DMCA
              </Link>
              <Link
                to={legalPath(locale, "2257")}
                className="text-sm font-medium transition-opacity hover:opacity-80"
              >
                2257
              </Link>
              <a
                href={`mailto:${contactEmail}`}
                className="text-sm font-medium transition-opacity hover:opacity-80"
              >
                Contact
              </a>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {t(locale, "index.footerCopyright", {
                year: new Date().getFullYear(),
              })}
            </p>
            <p className="text-xs text-muted-foreground text-center mt-2">
              {t(locale, "index.footerModels18Plus")}{" "}
              <Link
                to={legalPath(locale, "2257")}
                className="text-primary hover:opacity-80"
              >
                18 U.S.C. § 2257
              </Link>
            </p>
            {footerText && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                {footerText}
              </p>
            )}
          </div>
        </footer>
      </div>
    </>
  );
}
