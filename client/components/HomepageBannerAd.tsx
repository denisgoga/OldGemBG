import type { ReactNode } from "react";
import type { PublicHomepageBanner } from "@shared/api";
import { cn } from "@/lib/utils";
import { CATALOG_THUMBNAIL_FRAME_CLASS } from "@/components/VideoCard";
import { BannerHtmlContent } from "@/components/BannerHtmlContent";

type Props = { banner: PublicHomepageBanner };

const SIZE_CLASS: Record<PublicHomepageBanner["size"], string> = {
  native: "h-64",
  "300x250": "h-64",
  "300x100": "h-32",
};

export function bannerHasContent(banner: PublicHomepageBanner): boolean {
  const mediaType = banner.media_type ?? "image";
  if (mediaType === "html") return !!banner.html_content?.trim();
  if (mediaType === "video") return !!banner.video_url?.trim();
  return !!banner.image_url?.trim();
}

export function HomepageBannerAd({ banner }: Props) {
  const alt = banner.alt_text?.trim() || "Advertisement";
  const link = banner.link_url?.trim();
  const outbound = link ? /^https?:\/\//i.test(link) : false;
  const heightClass = SIZE_CLASS[banner.size] ?? SIZE_CLASS.native;
  const mediaType = banner.media_type ?? "image";

  const shell = cn(
    CATALOG_THUMBNAIL_FRAME_CLASS,
    heightClass,
    "group relative block w-full overflow-hidden transition-all duration-300",
    link
      ? "cursor-pointer hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      : "cursor-default",
  );

  const label = (
    <span className="pointer-events-none absolute left-3 top-3 z-10 rounded bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90">
      Ad
    </span>
  );

  let body: ReactNode;

  if (mediaType === "html") {
    body = (
      <BannerHtmlContent
        html={banner.html_content ?? ""}
        slotId={`banner-${banner.id}`}
        className="h-full w-full overflow-hidden bg-card"
      />
    );
  } else if (mediaType === "video") {
    body = (
      <video
        src={banner.video_url ?? ""}
        className="h-full w-full bg-black object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={alt}
      />
    );
  } else {
    body = (
      <img
        src={banner.image_url}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="h-full w-full bg-card object-contain object-center"
      />
    );
  }

  if (link) {
    return (
      <a
        href={link}
        className={shell}
        {...(outbound
          ? { target: "_blank", rel: "noopener noreferrer sponsored" }
          : {})}
        aria-label={alt}
      >
        {label}
        {body}
      </a>
    );
  }

  return (
    <div className={shell} role="img" aria-label={alt}>
      {label}
      {body}
    </div>
  );
}
