-- Banner media types (image / video / HTML) + site popunder settings.
ALTER TABLE homepage_banners
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS html_content TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS video_url TEXT NOT NULL DEFAULT '';

ALTER TABLE homepage_banners DROP CONSTRAINT IF EXISTS homepage_banners_media_type_check;
ALTER TABLE homepage_banners
  ADD CONSTRAINT homepage_banners_media_type_check
  CHECK (media_type IN ('image', 'video', 'html'));

ALTER TABLE homepage_banners ALTER COLUMN image_url DROP NOT NULL;
ALTER TABLE homepage_banners ALTER COLUMN image_url SET DEFAULT '';

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS popunder_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS popunder_url TEXT NOT NULL DEFAULT '';
