import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { notifySiteScriptsReady } from "@/lib/injectManagedHtml";

type Props = {
  html: string;
  slotId: string;
  className?: string;
};

/** Mount ad HTML like corngem.com — full natural size, scripts re-executed. */
function mountBannerHtml(container: HTMLElement, html: string) {
  const trimmed = html.trim();
  if (!trimmed) {
    container.replaceChildren();
    return;
  }

  container.innerHTML = trimmed;

  container.querySelectorAll("script").forEach((oldScript) => {
    const script = document.createElement("script");
    for (const attr of Array.from(oldScript.attributes)) {
      script.setAttribute(attr.name, attr.value);
    }

    const src = oldScript.getAttribute("src");
    if (src?.startsWith("//")) {
      script.src = `https:${src}`;
    } else if (src) {
      script.src = src;
    }

    if (oldScript.textContent) {
      script.text = oldScript.textContent;
    }

    oldScript.replaceWith(script);
  });

  notifySiteScriptsReady();
}

/** Renders admin-provided HTML/scripts inside a banner slot (unconstrained height). */
export function BannerHtmlContent({ html, slotId, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    mountBannerHtml(el, html);
    return () => {
      el.replaceChildren();
    };
  }, [html, slotId]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "ad-banner-content flex min-h-[50px] w-full items-center justify-center overflow-visible",
        "[&_iframe]:mx-auto [&_img]:mx-auto [&>*]:max-w-full",
        className,
      )}
      data-banner-html-slot={slotId}
    />
  );
}
