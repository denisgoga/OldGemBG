import { useEffect, useState } from "react";
import type { BannerDeviceVisibility } from "@shared/bannerSlots";

const MOBILE_QUERY = "(max-width: 767px)";
const DESKTOP_QUERY = "(min-width: 768px)";

export function matchesBannerDevice(visibility: BannerDeviceVisibility): boolean {
  if (visibility === "all") return true;
  if (typeof window === "undefined") return false;
  if (visibility === "mobile") {
    return window.matchMedia(MOBILE_QUERY).matches;
  }
  return window.matchMedia(DESKTOP_QUERY).matches;
}

function queryForVisibility(visibility: BannerDeviceVisibility): string | null {
  if (visibility === "mobile") return MOBILE_QUERY;
  if (visibility === "desktop") return DESKTOP_QUERY;
  return null;
}

/** True when this banner should render on the current viewport. */
export function useBannerDeviceVisible(
  visibility: BannerDeviceVisibility,
): boolean {
  const [visible, setVisible] = useState(() => matchesBannerDevice(visibility));

  useEffect(() => {
    if (visibility === "all") {
      setVisible(true);
      return;
    }

    const query = queryForVisibility(visibility);
    if (!query) return;

    const mq = window.matchMedia(query);
    const sync = () => setVisible(mq.matches);
    sync();

    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [visibility]);

  return visible;
}
