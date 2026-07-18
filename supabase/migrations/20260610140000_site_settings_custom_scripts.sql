-- Admin-managed HTML snippets injected into document head / body on public pages.
ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS head_scripts TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS body_scripts TEXT NOT NULL DEFAULT '';
