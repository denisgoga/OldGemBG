import type { PublicHomepageBanner } from "@shared/api";
import {
  bannerGridColumnClass,
  bannerGridInnerClass,
  deviceVisibilityClass,
  getBannerSlotMeta,
} from "@shared/bannerSlots";
import { cn } from "@/lib/utils";
import { HomepageBannerAd } from "@/components/HomepageBannerAd";

type Props = {
  banner: PublicHomepageBanner;
  variant: "intro" | "grid" | "footer";
  className?: string;
};

function adVariant(variant: Props["variant"]): "header" | "grid" {
  return variant === "grid" ? "grid" : "header";
}

export function BannerSlot({ banner, variant, className }: Props) {
  const slotMeta = getBannerSlotMeta(banner.slot);

  return (
    <aside
      aria-label={banner.alt_text?.trim() || "Advertisement"}
      data-banner-slot={banner.slot}
      data-banner-device={banner.device_visibility}
      className={cn(
        deviceVisibilityClass(banner.device_visibility),
        variant === "grid" && bannerGridColumnClass(banner),
        variant !== "grid" && "w-full",
        className,
      )}
    >
      {slotMeta ? (
        <span className="sr-only">{slotMeta.label}</span>
      ) : null}
      <div
        className={cn(
          variant === "grid"
            ? bannerGridInnerClass(banner)
            : "w-full",
        )}
      >
        <HomepageBannerAd banner={banner} variant={adVariant(variant)} />
      </div>
    </aside>
  );
}
