import { supabase } from "@/lib/supabase";

export const SITE_POPUNDER_SESSION_KEY = "sitePopunderShown";

type PopunderSettings = { enabled: boolean; url: string };

let cached: PopunderSettings | null = null;
let loadPromise: Promise<PopunderSettings | null> | null = null;

/**
 * Classic popunder: open blank tab during user gesture, navigate, then refocus main window.
 * Do not pass noopener — it prevents blur() and the tab stays on top as a popup.
 */
export function openPopunder(url: string) {
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

export function getCachedPopunderSettings() {
  return cached;
}

export function applyPopunderSettingsFromRow(row: {
  popunder_enabled?: boolean;
  popunder_url?: string | null;
}) {
  const url = (row.popunder_url ?? "").trim();
  cached = {
    enabled: !!row.popunder_enabled && url.length > 0,
    url,
  };
}

export async function loadSitePopunderSettings(): Promise<PopunderSettings | null> {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("popunder_enabled, popunder_url")
        .limit(1)
        .maybeSingle();
      if (error || !data) {
        cached = null;
        return null;
      }
      applyPopunderSettingsFromRow(data);
      return cached;
    } catch {
      cached = null;
      return null;
    }
  })();

  return loadPromise;
}

/** Call synchronously from a click handler (e.g. age gate Yes). */
export function tryOpenPopunderFromUserGesture(): boolean {
  if (sessionStorage.getItem(SITE_POPUNDER_SESSION_KEY) === "true") return false;
  if (!cached?.enabled || !cached.url) return false;

  sessionStorage.setItem(SITE_POPUNDER_SESSION_KEY, "true");
  openPopunder(cached.url);
  return true;
}
