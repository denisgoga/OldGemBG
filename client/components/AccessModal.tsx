import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase, type PopupSettings, type Video } from "@/lib/supabase";
import { pickAffiliateUrl } from "@/lib/pickAffiliateUrl";
import { useLocale } from "@/i18n/LocaleContext";
import { t } from "@/i18n/dictionary";
import { getPopupStringsForLocale } from "@/i18n/dbTranslation";

interface AccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: Video | null;
  popupSettings?: PopupSettings | null;
}

export function AccessModal({
  isOpen,
  onClose,
  selectedItem,
  popupSettings: popupSettingsProp = null,
}: AccessModalProps) {
  const [registrationStarted, setRegistrationStarted] = useState(false);
  const locale = useLocale();
  const [popupSettings, setPopupSettings] = useState<PopupSettings | null>(
    popupSettingsProp,
  );
  const [loading, setLoading] = useState(!popupSettingsProp);
  const popupStrings = getPopupStringsForLocale(popupSettings, locale);
  const waitingTitle = popupStrings.waiting_title ?? "Waiting for Registration";
  const waitingDescription =
    popupStrings.waiting_description ??
    "Please complete your free registration in the new window. Once you finish, you'll have full access to all premium videos.";
  const waitingButtonText =
    popupStrings.waiting_button_text ?? "Open Link Again";

  useEffect(() => {
    if (popupSettingsProp) {
      setPopupSettings(popupSettingsProp);
      setLoading(false);
    }
  }, [popupSettingsProp]);

  useEffect(() => {
    if (popupSettingsProp || !isOpen) return;
    let cancelled = false;

    const fetchPopupSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("popup_settings")
          .select("*")
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (!cancelled && data) setPopupSettings(data);
      } catch (error) {
        console.error("Error fetching popup settings:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchPopupSettings();
    return () => {
      cancelled = true;
    };
  }, [popupSettingsProp, isOpen]);

  // Check registration state on mount - only during current session
  useEffect(() => {
    const started = sessionStorage.getItem("registrationStarted") === "true";
    setRegistrationStarted(started);
  }, []);

  const handleFreeRegistration = () => {
    // Store in sessionStorage (clears when browser closes)
    sessionStorage.setItem("registrationStarted", "true");
    setRegistrationStarted(true);

    // Open affiliate link in a new window/tab
    const url = pickAffiliateUrl(popupSettings);
    if (url) window.open(url, "_blank");
  };

  if (!isOpen || loading || !popupSettings) return null;

  return (
    <div
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-card border border-border rounded-xl p-8 max-w-md w-full mx-4 relative shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        {!registrationStarted ? (
          <>
            <div className="text-center mb-8">
              <div className="inline-block p-3 rounded-lg mb-4 bg-secondary border border-border">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-2 text-white">
                {popupStrings.title}
              </h2>
              {selectedItem?.title && (
                <p className="text-sm text-primary/90 font-medium mb-2">
                  {t(locale, "accessModal.unlockPrefix")}: {selectedItem.title}
                </p>
              )}
              <p className="mb-6 text-sm text-gray-300">
                {popupStrings.description}
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {t(locale, "accessModal.continueBrowsing")}
              </button>
              <button
                onClick={handleFreeRegistration}
                className="flex-1 btn-gradient text-white font-semibold py-3 rounded-lg transition-all"
              >
                {popupStrings.button_text}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="inline-block p-3 rounded-lg mb-4 bg-secondary border border-border">
                <svg
                  className="w-8 h-8 animate-spin text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-2 text-white">
                {waitingTitle}
              </h2>
              <p className="text-sm text-gray-300">
                {waitingDescription}
              </p>
            </div>

            <button
              onClick={() => {
                const url = pickAffiliateUrl(popupSettings);
                if (url) window.open(url, "_blank");
              }}
              className="w-full btn-gradient text-white font-semibold py-3 rounded-lg transition-all"
            >
              {waitingButtonText}
            </button>
          </>
        )}

      </div>
    </div>
  );
}
