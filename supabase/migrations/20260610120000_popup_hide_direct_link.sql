-- Hide registration popup: open affiliate link after thumbnail warmup instead.
ALTER TABLE popup_settings
  ADD COLUMN IF NOT EXISTS hide_popup BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS direct_link_hint TEXT NOT NULL DEFAULT 'Almost there - finish signup to watch.';

UPDATE popup_settings
SET popup_translations = popup_translations
  || jsonb_build_object(
    'en',
    COALESCE(popup_translations->'en', '{}'::jsonb)
      || jsonb_build_object(
        'direct_link_hint',
        'Almost there - finish signup to watch.'
      )
  )
WHERE popup_translations IS NOT NULL;
