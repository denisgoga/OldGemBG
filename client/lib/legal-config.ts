/** Legal contact info — override via Vite env (production: oldgem.net). */

function siteHostname(): string {
  const url = import.meta.env.VITE_SITE_URL?.trim();
  if (!url) return "oldgem.net";
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  }
}

function emailOrDefault(envKey: string, fallbackPrefix: string): string {
  const fromEnv = import.meta.env[envKey]?.trim();
  if (fromEnv) return fromEnv;
  return `${fallbackPrefix}@${siteHostname()}`;
}

export function getLegalSiteName(): string {
  return import.meta.env.VITE_SITE_NAME?.trim() || "OldGem.Net";
}

export function getLegalDomain(): string {
  return siteHostname();
}

export function getContactEmail(): string {
  return emailOrDefault("VITE_LEGAL_EMAIL", "info");
}

export function getDmcaEmail(): string {
  return emailOrDefault("VITE_DMCA_EMAIL", "dmca");
}

export function getPrivacyEmail(): string {
  return emailOrDefault("VITE_PRIVACY_EMAIL", "privacy");
}

export function getDmcaAgentName(): string {
  return (
    import.meta.env.VITE_DMCA_AGENT_NAME?.trim() ||
    `DMCA Agent — ${getLegalSiteName()}`
  );
}

/** Optional designated agent postal address (shown on /dmca). */
export function getDmcaPostalAddress(): string | null {
  const raw = import.meta.env.VITE_DMCA_POSTAL_ADDRESS?.trim();
  return raw || null;
}
