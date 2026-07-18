import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { injectManagedHtml } from "@/lib/injectManagedHtml";

function isAdminPath(pathname: string) {
  return /\/admin(-login)?(\/|$)/.test(pathname);
}

export function SiteManagedScripts() {
  const location = useLocation();
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (isAdminPath(location.pathname)) {
      cleanupRef.current?.();
      cleanupRef.current = null;
      return;
    }

    let cancelled = false;

    const applyScripts = (
      headScripts: string | null | undefined,
      bodyScripts: string | null | undefined,
    ) => {
      cleanupRef.current?.();
      const cleanupHead = injectManagedHtml(
        "head",
        headScripts ?? "",
        "site-head",
      );
      const cleanupBody = injectManagedHtml(
        "body",
        bodyScripts ?? "",
        "site-body",
      );
      cleanupRef.current = () => {
        cleanupHead();
        cleanupBody();
      };
    };

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("head_scripts, body_scripts")
          .limit(1)
          .maybeSingle();
        if (cancelled || error) return;
        applyScripts(data?.head_scripts, data?.body_scripts);
      } catch {
        /* ignore */
      }
    };

    void load();

    const channel = supabase
      .channel("site-managed-scripts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings" },
        (payload) => {
          const row = payload.new as {
            head_scripts?: string | null;
            body_scripts?: string | null;
          };
          applyScripts(row.head_scripts, row.body_scripts);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
      void channel.unsubscribe();
    };
  }, [location.pathname]);

  return null;
}
