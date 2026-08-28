import type { PublicCatalogVideo, PublicHomepageBanner } from "./api";
import { bannersForSlot } from "./bannerSlots";

type Video = PublicCatalogVideo;

export type BannerLayoutSlot = {
  kind: "banner";
  banner: PublicHomepageBanner;
  key: string;
};

export type HomepageBannerLayout = {
  introBanners: PublicHomepageBanner[];
  belowGridBanners: PublicHomepageBanner[];
  gridSlots: Array<{ kind: "video"; video: Video } | BannerLayoutSlot>;
};

export function buildHomepageBannerLayout(
  videoList: Video[],
  bannerList: PublicHomepageBanner[],
): HomepageBannerLayout {
  const introBanners = bannersForSlot(bannerList, "home_below_intro");
  const belowGridBanners = bannersForSlot(bannerList, "home_below_grid");

  const gridBannerLists = {
    3: bannersForSlot(bannerList, "home_grid_after_3"),
    6: bannersForSlot(bannerList, "home_grid_after_6"),
    9: bannersForSlot(bannerList, "home_grid_after_9"),
  } as const;

  const gridSlots: HomepageBannerLayout["gridSlots"] = [];
  const placedBannerIds = new Set<string>();

  const pushBanners = (
    banners: PublicHomepageBanner[],
    count: number,
    keyPrefix: string,
  ) => {
    for (const banner of banners) {
      if (placedBannerIds.has(banner.id)) continue;
      placedBannerIds.add(banner.id);
      gridSlots.push({
        kind: "banner",
        banner,
        key: `${keyPrefix}-${count}-${banner.id}`,
      });
    }
  };

  videoList.forEach((video, idx) => {
    gridSlots.push({ kind: "video", video });
    const count = idx + 1;
    if (count !== 3 && count !== 6 && count !== 9) return;
    pushBanners(gridBannerLists[count as 3 | 6 | 9], count, "banner-after");
  });

  for (const count of [3, 6, 9] as const) {
    const remaining = gridBannerLists[count].filter(
      (b) => !placedBannerIds.has(b.id),
    );
    pushBanners(remaining, count, "banner-fallback");
  }

  return { introBanners, belowGridBanners, gridSlots };
}

export { bannerHasContent } from "./bannerSlots";
