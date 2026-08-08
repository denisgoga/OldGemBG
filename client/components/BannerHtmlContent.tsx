import { useEffect, useRef } from "react";
import { injectManagedHtmlInto } from "@/lib/injectManagedHtml";

type Props = {
  html: string;
  slotId: string;
  className?: string;
};

/** Renders admin-provided HTML/scripts inside a banner slot. */
export function BannerHtmlContent({ html, slotId, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    return injectManagedHtmlInto(el, html, slotId);
  }, [html, slotId]);

  return (
    <div
      ref={containerRef}
      className={className}
      data-banner-html-slot={slotId}
    />
  );
}
