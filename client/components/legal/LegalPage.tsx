import { useEffect, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";
import {
  getContactEmail,
  getDmcaEmail,
  getLegalDomain,
  getLegalSiteName,
  getPrivacyEmail,
} from "@/lib/legal-config";
import { legalPath } from "@/lib/legalPaths";
import { applyDocumentSeo } from "@/lib/seo";
import { isSupportedLocale, type Locale } from "@/i18n/locales";

export interface LegalSection {
  title: string;
  content: ReactNode;
}

interface LegalPageProps {
  title: string;
  description: string;
  lastUpdated: string;
  sections: LegalSection[];
}

export function LegalPage({
  title,
  description,
  lastUpdated,
  sections,
}: LegalPageProps) {
  const { locale = "en" } = useParams<{ locale: string }>();
  const site = getLegalSiteName();
  const seoLocale: Locale = isSupportedLocale(locale) ? locale : "en";

  useEffect(() => {
    applyDocumentSeo({
      title: `${title} | ${site}`,
      description,
      locale: seoLocale,
    });
  }, [title, description, site, seoLocale]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
          <Logo />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 sm:px-6 py-8 sm:py-12">
        <Link
          to={`/${locale}/`}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <header className="mb-10 border-b border-border pb-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
            {site}
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
          <p className="mt-4 text-xs text-muted-foreground/70">
            Last updated: {lastUpdated}
          </p>
        </header>

        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-3 text-lg font-semibold">{section.title}</h2>
              <div className="space-y-3 text-sm leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:opacity-80 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
                {section.content}
              </div>
            </section>
          ))}
        </div>
      </main>

      <footer className="border-t border-border bg-secondary/50 mt-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link to={legalPath(locale, "dmca")} className="hover:text-primary">
            DMCA
          </Link>
          <span aria-hidden>·</span>
          <Link to={legalPath(locale, "terms")} className="hover:text-primary">
            Terms
          </Link>
          <span aria-hidden>·</span>
          <Link to={legalPath(locale, "privacy")} className="hover:text-primary">
            Privacy
          </Link>
          <span aria-hidden>·</span>
          <Link to={legalPath(locale, "2257")} className="hover:text-primary">
            2257
          </Link>
        </div>
      </footer>
    </div>
  );
}

export const SITE = getLegalSiteName();
export const DOMAIN = getLegalDomain();
export const CONTACT_EMAIL = getContactEmail();
export const DMCA_EMAIL = getDmcaEmail();
export const PRIVACY_EMAIL = getPrivacyEmail();
