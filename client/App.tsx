import "./global.css";

import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AgeGate } from "./components/AgeGate";
import NotFound from "./pages/NotFound";
import { LocaleProvider } from "@/i18n/LocaleContext";
import { SUPPORTED_LOCALES, type Locale } from "@/i18n/locales";
import { SiteManagedScripts } from "@/components/SiteManagedScripts";
import { SitePopunder } from "@/components/SitePopunder";

const queryClient = new QueryClient();

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

const App = () => {
  const [ageVerified, setAgeVerified] = useState(false);
  const [locale] = useState<Locale>(() => {
    return getLocaleFromPathname(window.location.pathname) ?? detectLocaleFromNavigator();
  });

  useEffect(() => {
    // Ensure URL has locale prefix (/:locale/...) for SEO + correct routing.
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
          <AgeGate onVerified={setAgeVerified} />
          {ageVerified && (
            <BrowserRouter>
              <SiteManagedScripts />
              <Routes>
                <Route path="/:locale" element={<Index />} />
                <Route path="/:locale/" element={<Index />} />
                <Route
                  path="/:locale/admin-login"
                  element={<AdminLogin />}
                />
                <Route
                  path="/:locale/admin"
                  element={
                    <ProtectedRoute>
                      <Admin />
                    </ProtectedRoute>
                  }
                />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          )}
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
