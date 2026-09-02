/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_KEY: string;
  readonly VITE_VIDEO_THUMB_BUCKET?: string;
  readonly VITE_DISABLE_CATALOG_API?: string;
  readonly VITE_DISABLE_VIDEO_REALTIME?: string;
  readonly VITE_SITE_URL?: string;
  readonly VITE_SITE_NAME?: string;
  readonly VITE_DMCA_EMAIL?: string;
  readonly VITE_LEGAL_EMAIL?: string;
  readonly VITE_PRIVACY_EMAIL?: string;
  readonly VITE_DMCA_AGENT_NAME?: string;
  readonly VITE_DMCA_POSTAL_ADDRESS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
