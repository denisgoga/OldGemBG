import type { PublicHomepageBanner } from "@shared/api";
import {
  bannerGridColumnClass,
  bannerGridInnerClass,
  getBannerSlotMeta,
} from "@shared/bannerSlots";
import { cn } from "@/lib/utils";
import { useBannerDeviceVisible } from "@/lib/bannerDeviceVisibility";
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
  const visible = useBannerDeviceVisible(banner.device_visibility ?? "all");
  const slotMeta = getBannerSlotMeta(banner.slot);

  if (!visible) return null;

  return (
    <aside
      aria-label={banner.alt_text?.trim() || "Advertisement"}
      data-banner-slot={banner.slot}
      data-banner-device={banner.device_visibility}
      className={cn(
        "banner-slot",
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
