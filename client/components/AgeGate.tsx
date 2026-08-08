import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { useLocale } from "@/i18n/LocaleContext";
import { t } from "@/i18n/dictionary";
import { tryOpenPopunderFromUserGesture } from "@/lib/sitePopunder";

interface AgeGateProps {
  onVerified: (verified: boolean) => void;
}

export function AgeGate({ onVerified }: AgeGateProps) {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [rejected, setRejected] = useState(false);
  const locale = useLocale();

  // Check if user already verified
  useEffect(() => {
    const verified = sessionStorage.getItem("ageVerified") === "true";
    const rejectedBefore = sessionStorage.getItem("ageRejected") === "true";

    if (verified) {
      setIsVerified(true);
      onVerified(true);
    } else if (rejectedBefore) {
      setRejected(true);
      setIsVerified(false);
      onVerified(false);
    } else {
      setIsVerified(null);
      onVerified(false);
    }
  }, [onVerified]);

  const handleYes = () => {
    sessionStorage.setItem("ageVerified", "true");
    sessionStorage.removeItem("ageRejected");
    setIsVerified(true);
    setRejected(false);
    tryOpenPopunderFromUserGesture();
    onVerified(true);
  };

  const handleNo = () => {
    sessionStorage.setItem("ageRejected", "true");
    sessionStorage.removeItem("ageVerified");
    setRejected(true);
    setIsVerified(false);
    onVerified(false);
  };

  // Show nothing if already verified
  if (isVerified === true) {
    return null;
  }

  // If user clicked "No" - show rejection message
  if (rejected) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="inline-block p-4 bg-destructive/20 rounded-lg mb-6">
            <svg
              className="w-12 h-12 text-destructive"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">
            {t(locale, "ageGate.accessRestrictedTitle")}
          </h1>
          <p className="text-lg text-gray-300 mb-2">
            {t(locale, "ageGate.accessRestrictedBody")}
          </p>
          <p className="text-sm text-gray-400 mt-6">
            {t(locale, "ageGate.accessRestrictedErrorHint")}
          </p>
        </div>
      </div>
    );
  }

  // Show age gate while verifying (or null state)
  if (isVerified === null) {
    return (
      <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center backdrop-blur-sm">
        <div className="bg-card border border-border rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
          <div className="text-center mb-8">
            <div className="mb-6 flex justify-center">
              <Logo />
            </div>

            <h1 className="text-3xl font-bold mb-4 text-white">
              {t(locale, "ageGate.verificationRequiredTitle")}
            </h1>

            <div className="bg-secondary rounded-lg p-4 mb-6 border border-border">
              <p className="text-sm text-gray-300 leading-relaxed">
                {t(locale, "ageGate.verificationBody")}
              </p>
            </div>

            <p className="text-xs text-gray-400">
              {t(locale, "ageGate.verificationQuestion")}
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleNo}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {t(locale, "ageGate.no")}
            </button>
            <button
              onClick={handleYes}
              className="flex-1 btn-gradient text-white font-semibold py-3 rounded-lg transition-all"
            >
              {t(locale, "ageGate.yesConfirm")}
            </button>
          </div>

        </div>
      </div>
    );
  }

  return null;
}
