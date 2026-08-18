import { supabase } from "@/lib/supabase";
import {
  injectManagedHtmlAsync,
  notifySiteScriptsReady,
  SITE_SCRIPTS_INJECTED_ATTR,
} from "@/lib/injectManagedHtml";

function isAdminPath(pathname: string) {
  return /\/admin(-login)?(\/|$)/.test(pathname);
}

let injectPromise: Promise<boolean> | null = null;
let cleanupHead: (() => void) | null = null;
let cleanupBody: (() => void) | null = null;

async function applyManagedScripts(
  headScripts: string | null | undefined,
  bodyScripts: string | null | undefined,
): Promise<boolean> {
  if (isAdminPath(window.location.pathname)) {
    return false;
  }

  cleanupHead?.();
  cleanupBody?.();
  cleanupHead = await injectManagedHtmlAsync(
    "head",
    headScripts ?? "",
    "site-head",
  );
  cleanupBody = await injectManagedHtmlAsync(
    "body",
    bodyScripts ?? "",
    "site-body",
  );

  document.documentElement.setAttribute(SITE_SCRIPTS_INJECTED_ATTR, "1");
  notifySiteScriptsReady();
  return true;
}

export async function ensureManagedScriptsInjected(): Promise<boolean> {
  if (document.documentElement.hasAttribute(SITE_SCRIPTS_INJECTED_ATTR)) {
    return false;
  }

  if (isAdminPath(window.location.pathname)) {
    return false;
  }

  if (!injectPromise) {
    injectPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("head_scripts, body_scripts")
          .limit(1)
          .maybeSingle();
        if (error || !data) return false;
        return applyManagedScripts(data.head_scripts, data.body_scripts);
      } catch {
        return false;
      }
    })();
  }

  return injectPromise;
}

/** Start loading ad snippets before the age gate (pop-under tags hook the Yes click). */
export function preloadManagedScripts(): void {
  void ensureManagedScriptsInjected();
}

/** Re-notify ad tags after age verification if scripts were already injected. */
export function bootstrapManagedScriptsAfterAgeGate(): void {
  void ensureManagedScriptsInjected().then((injected) => {
    if (!injected) {
      notifySiteScriptsReady();
    }
  });
}

export async function refreshManagedScriptsFromRow(row: {
  head_scripts?: string | null;
  body_scripts?: string | null;
}): Promise<void> {
  if (isAdminPath(window.location.pathname)) return;
  await applyManagedScripts(row.head_scripts, row.body_scripts);
}

export function teardownManagedScripts(): void {
  cleanupHead?.();
  cleanupBody?.();
  cleanupHead = null;
  cleanupBody = null;
  document.documentElement.removeAttribute(SITE_SCRIPTS_INJECTED_ATTR);
  injectPromise = null;
}
