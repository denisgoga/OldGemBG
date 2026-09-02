import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
  LegalPage,
  SITE,
  DOMAIN,
  CONTACT_EMAIL,
} from "@/components/legal/LegalPage";
import { legalPath } from "@/lib/legalPaths";

export default function Terms() {
  const { locale = "en" } = useParams<{ locale: string }>();

  useEffect(() => {
    document.title = `Terms of Service | ${SITE}`;
  }, []);

  return (
    <LegalPage
      title="Terms of Service"
      description={`Please read these terms carefully before using ${DOMAIN}. By accessing this website, you agree to be bound by these terms.`}
      lastUpdated="September 2, 2026"
      sections={[
        {
          title: "1. Acceptance of Terms",
          content: (
            <p>
              By accessing or using {DOMAIN} (the &quot;Site&quot;), operated by{" "}
              {SITE}, you agree to these Terms of Service and our Privacy Policy.
              If you do not agree, you must not use the Site.
            </p>
          ),
        },
        {
          title: "2. Age Requirement",
          content: (
            <p>
              This Site contains adult-oriented content intended exclusively for
              individuals who are at least <strong>18 years of age</strong> (or
              the age of majority in your jurisdiction, whichever is higher). By
              entering the Site, you represent and warrant that you meet this age
              requirement.
            </p>
          ),
        },
        {
          title: "3. Permitted Use",
          content: (
            <>
              <p>You may use the Site for personal, non-commercial purposes only. You agree not to:</p>
              <ul>
                <li>Violate any applicable local, national, or international law</li>
                <li>Attempt to gain unauthorized access to the Site or its systems</li>
                <li>Scrape, crawl, or automate access to the Site without permission</li>
                <li>Redistribute, reproduce, or commercially exploit Site content</li>
                <li>Upload or distribute malware, spam, or harmful code</li>
                <li>Impersonate any person or entity</li>
              </ul>
            </>
          ),
        },
        {
          title: "4. Content Disclaimer",
          content: (
            <p>
              All content on the Site is provided for entertainment purposes.
              {SITE} does not guarantee the accuracy, completeness, or availability
              of any content. Third-party links (including partner verification
              pages) are provided for convenience and are subject to their own
              terms and policies.
            </p>
          ),
        },
        {
          title: "5. Intellectual Property",
          content: (
            <p>
              The Site design, branding, logos, and original materials are owned
              by {SITE} and protected by applicable intellectual property laws.
              Unauthorized use of our trademarks or content is prohibited. To
              report copyright infringement, see our{" "}
              <Link to={legalPath(locale, "dmca")}>DMCA Policy</Link>.
            </p>
          ),
        },
        {
          title: "6. Limitation of Liability",
          content: (
            <p>
              To the fullest extent permitted by law, {SITE} shall not be liable
              for any indirect, incidental, special, or consequential damages
              arising from your use of the Site. The Site is provided &quot;as
              is&quot; without warranties of any kind.
            </p>
          ),
        },
        {
          title: "7. Changes to Terms",
          content: (
            <p>
              We may update these Terms from time to time. Continued use of the
              Site after changes constitutes acceptance of the revised Terms.
            </p>
          ),
        },
        {
          title: "8. Contact",
          content: (
            <p>
              Questions about these Terms:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </p>
          ),
        },
      ]}
    />
  );
}
