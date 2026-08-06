-- Ensure anon/admin client can insert/update/delete videos (required for Admin panel).
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read" ON videos;
DROP POLICY IF EXISTS "Allow all for anon" ON videos;

CREATE POLICY "Allow public read" ON videos FOR SELECT USING (true);
CREATE POLICY "Allow all for anon" ON videos FOR ALL USING (true) WITH CHECK (true);
