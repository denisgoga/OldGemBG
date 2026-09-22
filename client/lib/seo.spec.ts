import { describe, expect, it } from "vitest";
import { canonicalPathname, localeToOgLocale } from "./seo";

describe("canonicalPathname", () => {
  it("normalizes locale homepages with a trailing slash", () => {
    expect(canonicalPathname("/en")).toBe("/en/");
    expect(canonicalPathname("/de/")).toBe("/de/");
  });

  it("strips query and hash", () => {
    expect(canonicalPathname("/en/dmca?ref=1#top")).toBe("/en/dmca");
  });

  it("defaults the bare root to English", () => {
    expect(canonicalPathname("/")).toBe("/en/");
  });
});

describe("localeToOgLocale", () => {
  it("maps supported locales", () => {
    expect(localeToOgLocale("en")).toBe("en_US");
    expect(localeToOgLocale("de")).toBe("de_DE");
    expect(localeToOgLocale("fr")).toBe("fr_FR");
  });
});
