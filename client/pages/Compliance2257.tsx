import { Link, useParams } from "react-router-dom";
import {
  LegalPage,
  SITE,
  DOMAIN,
  CONTACT_EMAIL,
} from "@/components/legal/LegalPage";
import {
  getDmcaAgentName,
  getDmcaPostalAddress,
} from "@/lib/legal-config";
import { legalPath } from "@/lib/legalPaths";

export default function Compliance2257() {
  const { locale = "en" } = useParams<{ locale: string }>();
  const custodian = getDmcaAgentName();
  const postalAddress = getDmcaPostalAddress();

  return (
    <LegalPage
      title="18 U.S.C. § 2257 Compliance Statement"
      description={`${SITE} is an adult-oriented website. This page describes our compliance with U.S. record-keeping requirements and confirms that all depicted persons are adults.`}
      lastUpdated="September 19, 2026"
      sections={[
        {
          title: "1. All Models Are 18 Years of Age or Older",
          content: (
            <>
              <p>
                All models, actors, actresses, and other persons who appear in
                any visual depiction of actual or simulated sexually explicit
                conduct displayed on {DOMAIN} were{" "}
                <strong>over the age of eighteen (18) years</strong> at the time
                those visual depictions were created.
              </p>
              <p>
                {SITE} does not knowingly publish content depicting minors. We
                take age compliance seriously and respond promptly to any report
                suggesting otherwise.
              </p>
            </>
          ),
        },
        {
          title: "2. Primary Producer / § 2257 Exemption",
          content: (
            <p>
              The owners and operators of {DOMAIN} are{" "}
              <strong>not the primary producers</strong> (as that term is defined
              in 18 U.S.C. § 2257) of the visual content indexed, linked, or
              embedded on this website. Thumbnails and previews may originate from
              third-party sources. Pursuant to 18 U.S.C. § 2257(h)(2)(B), custodial
              records required by § 2257 for such materials are maintained by the
              respective primary producers of those materials.
            </p>
          ),
        },
        {
          title: "3. Custodian of Records (Site Operator)",
          content: (
            <>
              <p>
                For inquiries regarding content on {DOMAIN} or this compliance
                statement, contact:
              </p>
              <div className="rounded-lg border border-border bg-secondary/40 p-4 text-foreground">
                <p className="font-medium">{custodian}</p>
                <p className="mt-2">
                  Email:{" "}
                  <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
                </p>
                {postalAddress ? (
                  <p className="mt-2 whitespace-pre-line text-muted-foreground">
                    {postalAddress}
                  </p>
                ) : null}
              </div>
            </>
          ),
        },
        {
          title: "4. Reporting Concerns",
          content: (
            <p>
              If you believe any content on {DOMAIN} depicts a person under 18,
              or violates applicable law, contact us immediately at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or submit a
              notice under our{" "}
              <Link to={legalPath(locale, "dmca")}>DMCA Policy</Link>. We will
              investigate and remove non-compliant material promptly.
            </p>
          ),
        },
        {
          title: "5. Age Restriction",
          content: (
            <p>
              This website is intended exclusively for adults. You must be at
              least 18 years of age (or the age of majority in your jurisdiction)
              to access {DOMAIN}. See our{" "}
              <Link to={legalPath(locale, "terms")}>Terms of Service</Link> for
              full details.
            </p>
          ),
        },
      ]}
    />
  );
}
