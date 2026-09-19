import "./global.css";

import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import Dmca from "./pages/Dmca";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Compliance2257 from "./pages/Compliance2257";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AgeGate } from "./components/AgeGate";
import NotFound from "./pages/NotFound";
import { LocaleProvider } from "@/i18n/LocaleContext";
import { SUPPORTED_LOCALES, type Locale } from "@/i18n/locales";
import { SitePopunder } from "@/components/SitePopunder";
import { loadSitePopunderSettings } from "@/lib/sitePopunder";
import { preloadManagedScripts } from "@/lib/siteManagedScriptsBoot";
import { isLegalPath } from "@/lib/legalPaths";

const queryClient = new QueryClient();

loadSitePopunderSettings();
preloadManagedScripts();

function getLocaleFromPathname(pathname: string): Locale | null {
  const match = pathname.match(/^\/(en|de|it|es|fr)(\/|$)/);
  if (!match) return null;
  return match[1] as Locale;
}

function detectLocaleFromNavigator(): Locale {
  const langs =
    navigator.languages?.length > 0 ? navigator.languages : [navigator.language];

  for (const lang of langs) {
    const base = lang.toLowerCase().split("-")[0];
    if (SUPPORTED_LOCALES.includes(base as Locale)) return base as Locale;
  }

  return "en";
}

function redirectToLocalePrefixedPath() {
  const { pathname, search, hash } = window.location;
  const localeInPath = getLocaleFromPathname(pathname);
  if (localeInPath) return;

  const locale = detectLocaleFromNavigator();
  const nextPathname = pathname === "/" ? `/${locale}/` : `/${locale}${pathname}`;
  const nextUrl = `${nextPathname}${search}${hash}`;
  window.location.replace(nextUrl);
}

function AppRoutes() {
  const location = useLocation();
  const skipAgeGate = isLegalPath(location.pathname);
  const [ageVerified, setAgeVerified] = useState(false);
  const canShowRoutes = ageVerified || skipAgeGate;

  return (
    <>
      {!skipAgeGate ? <AgeGate onVerified={setAgeVerified} /> : null}
      {canShowRoutes ? (
        <Routes>
          <Route path="/:locale/dmca" element={<Dmca />} />
          <Route path="/:locale/terms" element={<Terms />} />
          <Route path="/:locale/privacy" element={<Privacy />} />
          <Route path="/:locale/2257" element={<Compliance2257 />} />
          <Route path="/:locale" element={<Index />} />
          <Route path="/:locale/" element={<Index />} />
          <Route path="/:locale/admin-login" element={<AdminLogin />} />
          <Route
            path="/:locale/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      ) : null}
    </>
  );
}

const App = () => {
  const [locale] = useState<Locale>(() => {
    return getLocaleFromPathname(window.location.pathname) ?? detectLocaleFromNavigator();
  });

  useEffect(() => {
    redirectToLocalePrefixedPath();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <LocaleProvider locale={locale}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <SitePopunder />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </LocaleProvider>
  );
};

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
}
