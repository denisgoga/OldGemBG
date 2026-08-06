import type { PublicHomepageBanner } from "@shared/api";
import { cn } from "@/lib/utils";
import { CATALOG_THUMBNAIL_FRAME_CLASS } from "@/components/VideoCard";

type Props = { banner: PublicHomepageBanner };

const SIZE_CLASS: Record<PublicHomepageBanner["size"], string> = {
  native: "h-64",
  "300x250": "h-64",
  "300x100": "h-32",
};

export function HomepageBannerAd({ banner }: Props) {
  const alt = banner.alt_text?.trim() || "Advertisement";
  const link = banner.link_url?.trim();
  const outbound = link ? /^https?:\/\//i.test(link) : false;
  const heightClass = SIZE_CLASS[banner.size] ?? SIZE_CLASS.native;

  const shell = cn(
    CATALOG_THUMBNAIL_FRAME_CLASS,
    heightClass,
    "group block w-full overflow-hidden transition-all duration-300",
    link
      ? "cursor-pointer hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      : "cursor-default",
  );

  const image = (
    <img
      src={banner.image_url}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn(
        "h-full w-full bg-card transition-transform duration-300",
        banner.size === "300x100" ? "object-contain p-2" : "object-cover group-hover:scale-[1.02]",
      )}
    />
  );

  const label = (
    <span className="pointer-events-none absolute left-3 top-3 z-10 rounded bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90">
      Ad
    </span>
  );

  if (link) {
    return (
      <a
        href={link}
        className={cn(shell, "relative")}
        {...(outbound ? { target: "_blank", rel: "noopener noreferrer sponsored" } : {})}
        aria-label={alt}
      >
        {label}
        {image}
      </a>
    );
  }

  return (
    <div className={cn(shell, "relative")} role="img" aria-label={alt}>
      {label}
      {image}
    </div>
  );
}
