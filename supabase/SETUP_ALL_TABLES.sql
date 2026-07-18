-- ============================================================
-- OldGem.Net – Ekzekuto këtë skedar NË SUPABASE SQL EDITOR
-- Dashboard → SQL Editor → New query → paste → Run
-- ============================================================

-- 1) Tabela VIDEOS (përmbajtja: video / foto)
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  duration TEXT NOT NULL,
  thumbnail TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON videos;
DROP POLICY IF EXISTS "Allow all for anon" ON videos;
CREATE POLICY "Allow public read" ON videos FOR SELECT USING (true);
CREATE POLICY "Allow all for anon" ON videos FOR ALL USING (true) WITH CHECK (true);

-- 2) Tabela POPUP_SETTINGS (një rresht – cilësimet e modalit regjistrim)
CREATE TABLE IF NOT EXISTS popup_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Free Registration',
  description TEXT NOT NULL DEFAULT 'Register for free to unlock access to this content.',
  button_text TEXT NOT NULL DEFAULT 'Continue to free access',
  waiting_title TEXT NOT NULL DEFAULT 'Waiting for Registration',
  waiting_description TEXT NOT NULL DEFAULT 'Please complete your free registration in the new window. Once you finish, you''ll have full access to all premium videos.',
  waiting_button_text TEXT NOT NULL DEFAULT 'Open Link Again',
  button_color TEXT NOT NULL DEFAULT '#a855f7',
  popup_bg_color TEXT NOT NULL DEFAULT '#1a1410',
  affiliate_link TEXT NOT NULL DEFAULT '',
  affiliate_link_a TEXT NOT NULL DEFAULT '',
  affiliate_link_b TEXT NOT NULL DEFAULT '',
  affiliate_split_a INTEGER NOT NULL DEFAULT 50,
  hide_popup BOOLEAN NOT NULL DEFAULT false,
  direct_link_hint TEXT NOT NULL DEFAULT 'Almost there - finish signup to watch.',
  popup_translations JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE popup_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read popup" ON popup_settings;
DROP POLICY IF EXISTS "Allow all popup" ON popup_settings;
CREATE POLICY "Allow public read popup" ON popup_settings FOR SELECT USING (true);
CREATE POLICY "Allow all popup" ON popup_settings FOR ALL USING (true) WITH CHECK (true);

-- Fus rreshtin e parë në popup_settings nëse nuk ekziston
INSERT INTO popup_settings (title, description, button_text, waiting_title, waiting_description, waiting_button_text, button_color, popup_bg_color, affiliate_link, affiliate_link_a, affiliate_link_b, affiliate_split_a, hide_popup, direct_link_hint, popup_translations)
SELECT
  'Free Registration',
  'Register for free to unlock access to this content. You will be redirected to complete sign-up.',
  'Continue to free access',
  'Waiting for Registration',
  'Please complete your free registration in the new window. Once you finish, you''ll have full access to all premium videos.',
  'Open Link Again',
  '#a855f7',
  '#1a1410',
  'https://example.com',
  '',
  '',
  50,
  false,
  'Almost there - finish signup to watch.',
  jsonb_build_object(
    'en',
    jsonb_build_object(
      'title', 'Free Registration',
      'description', 'Register for free to unlock access to this content. You will be redirected to complete sign-up.',
      'button_text', 'Continue to free access',
      'waiting_title', 'Waiting for Registration',
      'waiting_description', 'Please complete your free registration in the new window. Once you finish, you''ll have full access to all premium videos.',
      'waiting_button_text', 'Open Link Again',
      'direct_link_hint', 'Almost there - finish signup to watch.'
    )
  )
WHERE NOT EXISTS (SELECT 1 FROM popup_settings LIMIT 1);

-- 3) Tabela SITE_SETTINGS (një rresht – SEO dhe teksti i faqes)
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_title TEXT,
  meta_description TEXT,
  og_image TEXT,
  landing_headline TEXT,
  landing_subhead TEXT,
  seo_intro TEXT,
  footer_text TEXT,
  head_scripts TEXT NOT NULL DEFAULT '',
  body_scripts TEXT NOT NULL DEFAULT '',
  site_translations JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read site" ON site_settings;
DROP POLICY IF EXISTS "Allow all site" ON site_settings;
CREATE POLICY "Allow public read site" ON site_settings FOR SELECT USING (true);
CREATE POLICY "Allow all site" ON site_settings FOR ALL USING (true) WITH CHECK (true);

INSERT INTO site_settings (meta_title, meta_description, landing_headline, landing_subhead, footer_text, site_translations)
SELECT
  'OldGem.Net - Free Premium Old Gem Videos!',
  'OldGem.Net - Free Premium Old Gem Videos! Watch exclusive content with free registration.',
  'Featured Content',
  'Browse our premium collection. Click on any item to get free access.',
  'Adults only. 18+. By entering you confirm you are of legal age.',
  jsonb_build_object(
    'en',
    jsonb_build_object(
      'meta_title', 'OldGem.Net - Free Premium Old Gem Videos!',
      'meta_description', 'OldGem.Net - Free Premium Old Gem Videos! Watch exclusive content with free registration.',
      'landing_headline', 'Featured Content',
      'landing_subhead', 'Browse our premium collection. Click on any item to get free access.',
      'seo_intro', NULL,
      'footer_text', 'Adults only. 18+. By entering you confirm you are of legal age.'
    )
  )
WHERE NOT EXISTS (SELECT 1 FROM site_settings LIMIT 1);

-- 4) Homepage grid banners (shown after every three thumbnails on the homepage)
CREATE TABLE IF NOT EXISTS homepage_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  link_url TEXT NOT NULL DEFAULT '',
  size TEXT NOT NULL DEFAULT '300x250'
    CONSTRAINT homepage_banners_setup_size_check CHECK (size IN ('300x250', '300x100', 'native')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  alt_text TEXT NOT NULL DEFAULT 'Advertisement',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS homepage_banners_active_sort_setup_idx
  ON homepage_banners (is_active, sort_order, created_at DESC);

ALTER TABLE homepage_banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read homepage banners" ON homepage_banners;
DROP POLICY IF EXISTS "Allow all homepage banners" ON homepage_banners;
CREATE POLICY "Allow public read homepage banners" ON homepage_banners FOR SELECT USING (true);
CREATE POLICY "Allow all homepage banners" ON homepage_banners FOR ALL USING (true) WITH CHECK (true);

-- 5) Storage: public bucket for video card thumbnails (Admin uploads).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'video-thumbnails',
  'video-thumbnails',
  true,
  5242880, -- 5 MB per object
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "video_thumbnails_select_public" ON storage.objects;
DROP POLICY IF EXISTS "video_thumbnails_insert_anon" ON storage.objects;
DROP POLICY IF EXISTS "video_thumbnails_update_anon" ON storage.objects;
DROP POLICY IF EXISTS "video_thumbnails_delete_anon" ON storage.objects;

CREATE POLICY "video_thumbnails_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'video-thumbnails');

CREATE POLICY "video_thumbnails_insert_anon"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'video-thumbnails');

CREATE POLICY "video_thumbnails_update_anon"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'video-thumbnails')
WITH CHECK (bucket_id = 'video-thumbnails');

CREATE POLICY "video_thumbnails_delete_anon"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'video-thumbnails');

-- 6) Realtime: Postgres changes subscription (live catalog / admin UX).
DO $realtime$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'videos'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.videos;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'homepage_banners'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.homepage_banners;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'popup_settings'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.popup_settings;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'site_settings'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;
    END IF;
  END IF;
END $realtime$;

-- Gata. Pas ekzekutimit: vendos në .env VITE_SUPABASE_URL dhe VITE_SUPABASE_KEY, pastaj rifreso dev serverin.
-- Në Admin vendos linkun e vërtetë të affiliate në Popup Settings.
