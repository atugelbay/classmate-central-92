-- Add company_id to settings table for multi-tenancy
ALTER TABLE settings ADD COLUMN IF NOT EXISTS company_id VARCHAR(255);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_settings_company_id ON settings(company_id);

-- Update existing settings to have a default company_id (if any exist)
-- This is a migration fix, so we'll set a placeholder for existing data
-- For existing records without company_id, we'll set it to 'default'
-- New records will have proper company_id from application
UPDATE settings SET company_id = 'default' WHERE company_id IS NULL;

-- Note: We keep company_id nullable for backwards compatibility
-- Application layer enforces company_id for new records

