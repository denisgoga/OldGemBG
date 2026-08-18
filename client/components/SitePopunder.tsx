import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  applyPopunderSettingsFromRow,
  loadSitePopunderSettings,
} from "@/lib/sitePopunder";
import {
  preloadManagedScripts,
  refreshManagedScriptsFromRow,
  teardownManagedScripts,
} from "@/lib/siteManagedScriptsBoot";

function isAdminPath(pathname: string) {
  return /\/admin(-login)?(\/|$)/.test(pathname);
}

/** Preloads popunder URL + managed head/body scripts before the age gate. */
export function SitePopunder() {
  useEffect(() => {
    if (isAdminPath(window.location.pathname)) {
      return;
    }

    void loadSitePopunderSettings();
    preloadManagedScripts();

    const channel = supabase
      .channel("site-popunder-scripts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings" },
        (payload) => {
          const row = payload.new as {
            popunder_enabled?: boolean;
            popunder_url?: string | null;
            head_scripts?: string | null;
            body_scripts?: string | null;
          };
          applyPopunderSettingsFromRow(row);
          void refreshManagedScriptsFromRow(row);
        },
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const onNavigate = () => {
      if (isAdminPath(window.location.pathname)) {
        teardownManagedScripts();
      }
    };

    window.addEventListener("popstate", onNavigate);
    return () => window.removeEventListener("popstate", onNavigate);
  }, []);

  return null;
}
