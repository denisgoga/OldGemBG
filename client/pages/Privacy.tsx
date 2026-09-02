import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
  LegalPage,
  SITE,
  DOMAIN,
  PRIVACY_EMAIL,
} from "@/components/legal/LegalPage";
import { legalPath } from "@/lib/legalPaths";

export default function Privacy() {
  const { locale = "en" } = useParams<{ locale: string }>();

  useEffect(() => {
    document.title = `Privacy Policy | ${SITE}`;
  }, []);

  return (
    <LegalPage
      title="Privacy Policy"
      description={`This Privacy Policy explains how ${SITE} (&quot;we&quot;, &quot;us&quot;) collects and uses information when you visit ${DOMAIN}.`}
      lastUpdated="September 2, 2026"
      sections={[
        {
          title: "1. Information We Collect",
          content: (
            <>
              <p>We may collect the following types of information:</p>
              <ul>
                <li>
                  <strong>Usage data:</strong> pages visited, clicks, referral
                  URLs, device type, browser, and general location
                  (country/region)
                </li>
                <li>
                  <strong>Technical data:</strong> IP address, cookies, and
                  similar identifiers
                </li>
                <li>
                  <strong>Age verification:</strong> a local browser flag
                  confirming you accepted the 18+ gate (stored in sessionStorage,
                  not sent to our servers)
                </li>
                <li>
                  <strong>Admin data:</strong> site settings and content managed
                  through our admin panel (not applicable to regular visitors)
                </li>
              </ul>
            </>
          ),
        },
        {
          title: "2. How We Use Information",
          content: (
            <>
              <p>We use collected information to:</p>
              <ul>
                <li>Operate and improve the Site</li>
                <li>Prevent fraud, abuse, and unauthorized access</li>
                <li>Comply with legal obligations</li>
                <li>Analyze traffic patterns and user preferences</li>
              </ul>
            </>
          ),
        },
        {
          title: "3. Cookies & Local Storage",
          content: (
            <>
              <p>
                We use cookies and browser storage to remember your age
                verification status and improve your experience. You can clear
                cookies and storage through your browser settings at any time,
                though this may reset your age verification preference.
              </p>
              <p>
                Third-party partners linked from the Site may set their own
                cookies subject to their privacy policies.
              </p>
            </>
          ),
        },
        {
          title: "4. Sharing of Information",
          content: (
            <p>
              We do not sell your personal information. We may share limited
              technical data with service providers (hosting, analytics, email
              routing) who assist in operating the Site, subject to
              confidentiality obligations and applicable law.
            </p>
          ),
        },
        {
          title: "5. Data Retention",
          content: (
            <p>
              We retain information only as long as necessary for the purposes
              described in this policy or as required by law.
            </p>
          ),
        },
        {
          title: "6. Your Rights",
          content: (
            <p>
              Depending on your jurisdiction, you may have rights to access,
              correct, or delete personal data we hold about you. Contact us to
              submit a request.
            </p>
          ),
        },
        {
          title: "7. Children",
          content: (
            <p>
              The Site is not intended for anyone under 18. We do not knowingly
              collect data from minors.
            </p>
          ),
        },
        {
          title: "8. Copyright & DMCA",
          content: (
            <p>
              To report copyright infringement, see our{" "}
              <Link to={legalPath(locale, "dmca")}>DMCA Policy</Link>.
            </p>
          ),
        },
        {
          title: "9. Contact",
          content: (
            <p>
              Privacy inquiries:{" "}
              <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>
            </p>
          ),
        },
      ]}
    />
  );
}
