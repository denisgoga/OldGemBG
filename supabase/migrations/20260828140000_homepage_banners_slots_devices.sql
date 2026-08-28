-- Banner slots, device targeting, layout width, internal name, leaderboard size.

ALTER TABLE homepage_banners DROP CONSTRAINT IF EXISTS homepage_banners_size_check;
ALTER TABLE homepage_banners
  ADD CONSTRAINT homepage_banners_size_check
  CHECK (size IN ('300x250', '300x100', '728x90', 'native'));

ALTER TABLE homepage_banners
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS slot TEXT NOT NULL DEFAULT 'home_below_intro',
  ADD COLUMN IF NOT EXISTS device_visibility TEXT NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS layout_width TEXT NOT NULL DEFAULT 'auto';

ALTER TABLE homepage_banners DROP CONSTRAINT IF EXISTS homepage_banners_slot_check;
ALTER TABLE homepage_banners
  ADD CONSTRAINT homepage_banners_slot_check
  CHECK (
    slot IN (
      'home_below_intro',
      'home_grid_after_3',
      'home_grid_after_6',
      'home_grid_after_9',
      'home_below_grid'
    )
  );

ALTER TABLE homepage_banners DROP CONSTRAINT IF EXISTS homepage_banners_device_visibility_check;
ALTER TABLE homepage_banners
  ADD CONSTRAINT homepage_banners_device_visibility_check
  CHECK (device_visibility IN ('all', 'mobile', 'desktop'));

ALTER TABLE homepage_banners DROP CONSTRAINT IF EXISTS homepage_banners_layout_width_check;
ALTER TABLE homepage_banners
  ADD CONSTRAINT homepage_banners_layout_width_check
  CHECK (layout_width IN ('auto', 'grid', 'full'));

-- Map legacy sort_order rows into explicit slots (first run only).
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      ORDER BY sort_order ASC NULLS LAST, created_at ASC
    ) - 1 AS rn
  FROM homepage_banners
)
UPDATE homepage_banners AS b
SET slot = CASE r.rn
  WHEN 0 THEN 'home_below_intro'
  WHEN 1 THEN 'home_grid_after_3'
  WHEN 2 THEN 'home_grid_after_6'
  WHEN 3 THEN 'home_grid_after_9'
  ELSE 'home_below_grid'
END
FROM ranked AS r
WHERE b.id = r.id
  AND (b.slot IS NULL OR b.slot = 'home_below_intro')
  AND b.name = '';

COMMENT ON COLUMN homepage_banners.slot IS 'Fixed homepage placement slot.';
COMMENT ON COLUMN homepage_banners.device_visibility IS 'all | mobile | desktop';
COMMENT ON COLUMN homepage_banners.layout_width IS 'auto | grid (one cell) | full (full row)';
