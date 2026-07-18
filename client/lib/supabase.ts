import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase credentials");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Video = {
  id: string;
  title: string;
  duration: string;
  thumbnail: string;
  sort_order: number | null;
  created_at: string;
};

export type PopupSettings = {
  id: string;
  title: string;
  description: string;
  button_text: string;
  waiting_title: string | null;
  waiting_description: string | null;
  waiting_button_text: string | null;
  button_color: string;
  popup_bg_color: string;
  affiliate_link: string;
  /** Optional legacy-safe fields for multi-link routing. */
  affiliate_link_a?: string | null;
  affiliate_link_b?: string | null;
  /** Percent (0-100) of clicks routed to affiliate_link_a. */
  affiliate_split_a?: number | null;
  /** When true, skip the registration popup and open the affiliate link after thumbnail warmup. */
  hide_popup?: boolean | null;
  /** Hint shown on the thumbnail while waiting for sign-up (direct link mode). */
  direct_link_hint?: string | null;
  // i18n JSONB map: { "en": { title, description, ... }, "de": { ... }, ... }
  popup_translations: Record<string, PopupTranslations> | null;
  created_at: string;
  updated_at: string;
};

export type PopupTranslations = {
  title?: string | null;
  description?: string | null;
  button_text?: string | null;
  waiting_title?: string | null;
  waiting_description?: string | null;
  waiting_button_text?: string | null;
  direct_link_hint?: string | null;
};

export type SiteSettings = {
  id: string;
  meta_title: string | null;
  meta_description: string | null;
  og_image: string | null;
  landing_headline: string | null;
  landing_subhead: string | null;
  seo_intro: string | null;
  footer_text: string | null;
  /** Raw HTML injected into document head on public pages (admin-managed). */
  head_scripts: string | null;
  /** Raw HTML injected before closing body on public pages (admin-managed). */
  body_scripts: string | null;
  // i18n JSONB map: { "en": { meta_title, ... }, "de": { ... }, ... }
  site_translations: Record<string, SiteTranslations> | null;
  created_at: string;
  updated_at: string;
};

export type SiteTranslations = {
  meta_title?: string | null;
  meta_description?: string | null;
  landing_headline?: string | null;
  landing_subhead?: string | null;
  seo_intro?: string | null;
  footer_text?: string | null;
  hide_landing_headline?: boolean | null;
  hide_landing_subhead?: boolean | null;
  hide_seo_intro?: boolean | null;
};

export type HomepageBanner = {
  id: string;
  image_url: string;
  link_url: string;
  size: "300x250" | "300x100" | "native";
  is_active: boolean;
  sort_order: number | null;
  alt_text: string;
  created_at: string;
  updated_at: string;
};
