import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";

const SESSION_KEY = "sitePopunderShown";

function isAdminPath(pathname: string) {
  return /\/admin(-login)?(\/|$)/.test(pathname);
}

/**
 * Classic popunder: open blank tab during user gesture, navigate, then refocus main window.
 * Do not pass noopener — it prevents blur() and the tab stays on top as a popup.
 */
function openPopunder(url: string) {
  const pop = window.open("about:blank", "_blank");
  if (!pop) return;

  try {
    pop.location.replace(url);
  } catch {
    try {
      pop.location.href = url;
    } catch {
      pop.close();
      return;
    }
  }

  const refocusMain = () => {
    try {
      pop.blur();
    } catch {
      /* ignore */
    }
    try {
      window.focus();
    } catch {
      /* ignore */
    }
  };

  refocusMain();
  window.setTimeout(refocusMain, 0);
  window.setTimeout(refocusMain, 100);

  try {
    pop.opener = null;
  } catch {
    /* ignore */
  }
}

export function SitePopunder() {
  const location = useLocation();

  useEffect(() => {
    if (isAdminPath(location.pathname)) return;
    if (sessionStorage.getItem(SESSION_KEY) === "true") return;

    let cancelled = false;
    let settings: { enabled: boolean; url: string } | null = null;

    const attachListener = () => {
      if (!settings?.enabled || !settings.url) return;

      const onPointerDown = (event: PointerEvent) => {
        if (event.button !== 0) return;
        if (sessionStorage.getItem(SESSION_KEY) === "true") return;
        sessionStorage.setItem(SESSION_KEY, "true");
        openPopunder(settings!.url);
        document.removeEventListener("pointerdown", onPointerDown, true);
      };

      document.addEventListener("pointerdown", onPointerDown, true);
      return () =>
        document.removeEventListener("pointerdown", onPointerDown, true);
    };

    let detachClick: (() => void) | undefined;

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("popunder_enabled, popunder_url")
          .limit(1)
          .maybeSingle();
        if (cancelled || error || !data) return;
        const url = (data.popunder_url ?? "").trim();
        settings = {
          enabled: !!data.popunder_enabled && url.length > 0,
          url,
        };
        detachClick = attachListener();
      } catch {
        /* ignore */
      }
    };

    void load();

    const channel = supabase
      .channel("site-popunder")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings" },
        (payload) => {
          detachClick?.();
          const row = payload.new as {
            popunder_enabled?: boolean;
            popunder_url?: string | null;
          };
          const url = (row.popunder_url ?? "").trim();
          settings = {
            enabled: !!row.popunder_enabled && url.length > 0,
            url,
          };
          if (sessionStorage.getItem(SESSION_KEY) !== "true") {
            detachClick = attachListener();
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      detachClick?.();
      void channel.unsubscribe();
    };
  }, [location.pathname]);

  return null;
}
