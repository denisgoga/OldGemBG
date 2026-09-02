import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
  LegalPage,
  SITE,
  DOMAIN,
  DMCA_EMAIL,
} from "@/components/legal/LegalPage";
import {
  getDmcaAgentName,
  getDmcaPostalAddress,
} from "@/lib/legal-config";
import { legalPath } from "@/lib/legalPaths";

export default function Dmca() {
  const { locale = "en" } = useParams<{ locale: string }>();
  const agentName = getDmcaAgentName();
  const postalAddress = getDmcaPostalAddress();

  useEffect(() => {
    document.title = `DMCA Policy | ${SITE}`;
  }, []);

  return (
    <LegalPage
      title="DMCA Policy"
      description={`${SITE} respects intellectual property rights and responds to valid notices under the Digital Millennium Copyright Act (DMCA).`}
      lastUpdated="September 2, 2026"
      sections={[
        {
          title: "1. Reporting Copyright Infringement",
          content: (
            <>
              <p>
                If you believe content on {DOMAIN} infringes your copyright, send
                a written DMCA notice to our designated agent with the following
                information:
              </p>
              <ul>
                <li>
                  Your physical or electronic signature as the copyright owner
                  or authorized agent
                </li>
                <li>
                  Identification of the copyrighted work claimed to have been
                  infringed
                </li>
                <li>
                  The exact URL(s) of the allegedly infringing material on{" "}
                  {DOMAIN}
                </li>
                <li>
                  Your contact information (name, address, phone, email)
                </li>
                <li>
                  A statement of good faith belief that use of the material is
                  not authorized by the copyright owner
                </li>
                <li>
                  A statement, under penalty of perjury, that the information in
                  the notice is accurate and that you are authorized to act on
                  behalf of the copyright owner
                </li>
              </ul>
            </>
          ),
        },
        {
          title: "2. Designated DMCA Agent",
          content: (
            <>
              <p>Send DMCA takedown notices and counter-notifications to:</p>
              <div className="rounded-lg border border-border bg-secondary/40 p-4 text-foreground">
                <p className="font-medium">{agentName}</p>
                <p className="mt-2">
                  Email:{" "}
                  <a href={`mailto:${DMCA_EMAIL}`}>{DMCA_EMAIL}</a>
                </p>
                {postalAddress ? (
                  <p className="mt-2 whitespace-pre-line text-muted-foreground">
                    {postalAddress}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  Subject line: &quot;DMCA Takedown Request — {DOMAIN}&quot;
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                We aim to acknowledge valid notices within 2 business days.
              </p>
            </>
          ),
        },
        {
          title: "3. Our Response",
          content: (
            <p>
              Upon receipt of a valid DMCA notice, we will promptly investigate
              and remove or disable access to the allegedly infringing content.
              We may notify the uploader and provide an opportunity to submit a
              counter-notification where applicable.
            </p>
          ),
        },
        {
          title: "4. Counter-Notification",
          content: (
            <>
              <p>
                If you believe your content was removed in error, you may submit
                a counter-notification including:
              </p>
              <ul>
                <li>Your physical or electronic signature</li>
                <li>Identification of the removed content and its prior location</li>
                <li>
                  A statement under penalty of perjury that the material was
                  removed by mistake or misidentification
                </li>
                <li>Your name, address, phone number, and consent to jurisdiction</li>
              </ul>
              <p>
                Send counter-notifications to{" "}
                <a href={`mailto:${DMCA_EMAIL}`}>{DMCA_EMAIL}</a>.
              </p>
            </>
          ),
        },
        {
          title: "5. Repeat Infringers",
          content: (
            <p>
              {SITE} maintains a policy of terminating access for users who are
              repeat copyright infringers in appropriate circumstances.
            </p>
          ),
        },
        {
          title: "6. False Claims",
          content: (
            <p>
              Knowingly submitting a false DMCA notice or counter-notification may
              result in liability for damages, including costs and attorney fees,
              under applicable law.
            </p>
          ),
        },
        {
          title: "7. Related Policies",
          content: (
            <p>
              See also our{" "}
              <Link to={legalPath(locale, "terms")}>Terms of Service</Link> and{" "}
              <Link to={legalPath(locale, "privacy")}>Privacy Policy</Link>.
            </p>
          ),
        },
      ]}
    />
  );
}
