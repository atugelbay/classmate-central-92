-- Remove company_id from settings table
DROP INDEX IF EXISTS idx_settings_company_id;
ALTER TABLE settings DROP COLUMN IF EXISTS company_id;

