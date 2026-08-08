import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  applyPopunderSettingsFromRow,
  loadSitePopunderSettings,
} from "@/lib/sitePopunder";

/** Preloads popunder settings; opens on age gate "Yes" via user gesture. */
export function SitePopunder() {
  useEffect(() => {
    void loadSitePopunderSettings();

    const channel = supabase
      .channel("site-popunder")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings" },
        (payload) => {
          applyPopunderSettingsFromRow(
            payload.new as {
              popunder_enabled?: boolean;
              popunder_url?: string | null;
            },
          );
        },
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, []);

  return null;
}
