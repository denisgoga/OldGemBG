UPDATE popup_settings
SET
  direct_link_hint = 'Almost there - finish signup to watch.',
  popup_translations = jsonb_set(
    COALESCE(popup_translations, '{}'::jsonb),
    '{en,direct_link_hint}',
    '"Almost there - finish signup to watch."'::jsonb,
    true
  )
WHERE direct_link_hint = 'Almost there — complete your free sign-up to watch'
   OR direct_link_hint IS NULL
   OR direct_link_hint = '';
