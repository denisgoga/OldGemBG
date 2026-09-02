/** Legal page path segments (after /:locale/). No age gate — required for DMCA / compliance crawlers. */
export const LEGAL_PAGE_SEGMENTS = ["dmca", "terms", "privacy"] as const;

export type LegalPageSegment = (typeof LEGAL_PAGE_SEGMENTS)[number];

export function isLegalPath(pathname: string): boolean {
  const segments = pathname.replace(/\/$/, "").split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  return (LEGAL_PAGE_SEGMENTS as readonly string[]).includes(last);
}

export function legalPath(locale: string, page: LegalPageSegment): string {
  return `/${locale}/${page}`;
}
