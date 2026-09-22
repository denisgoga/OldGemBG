import { useEffect } from "react";
import {
  applyPopunderSettingsFromRow,
  loadSitePopunderSettings,
} from "@/lib/sitePopunder";
import {
  preloadManagedScripts,
  refreshManagedScriptsFromRow,
  teardownManagedScripts,
} from "@/lib/siteManagedScriptsBoot";
import { fetchPublicCatalogPage } from "@/lib/fetchPublicCatalog";
import { isLegalPath } from "@/lib/legalPaths";

const catalogUrl =
  import.meta.env.VITE_PUBLIC_CATALOG_URL?.trim() || "/api/public/catalog";

function isAdminPath(pathname: string) {
  return /\/admin(-login)?(\/|$)/.test(pathname);
}

function shouldSkipSiteScripts(pathname: string) {
  return isAdminPath(pathname) || isLegalPath(pathname);
}

/** Preloads popunder URL + managed scripts from the cached catalog (no Realtime). */
export function SitePopunder() {
  useEffect(() => {
    if (shouldSkipSiteScripts(window.location.pathname)) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const catalog = await fetchPublicCatalogPage(catalogUrl, 1, 9);
        if (cancelled) return;
        if (catalog.siteSettings) {
          applyPopunderSettingsFromRow(catalog.siteSettings);
          await refreshManagedScriptsFromRow(catalog.siteSettings);
          return;
        }
      } catch {
        /* fall through to direct settings fetch */
      }
      if (cancelled) return;
      void loadSitePopunderSettings();
      preloadManagedScripts();
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onNavigate = () => {
      if (shouldSkipSiteScripts(window.location.pathname)) {
        teardownManagedScripts();
      }
    };

    window.addEventListener("popstate", onNavigate);
    return () => window.removeEventListener("popstate", onNavigate);
  }, []);

  return null;
}
