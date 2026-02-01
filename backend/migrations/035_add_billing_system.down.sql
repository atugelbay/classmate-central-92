-- ============================================================================
-- Migration Rollback: 035_add_billing_system
-- Description: Drops billing system tables
-- WARNING: This will delete all billing data!
-- ============================================================================

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_company_licenses_updated_at ON company_licenses;
DROP FUNCTION IF EXISTS update_company_licenses_updated_at();

-- Drop indexes
DROP INDEX IF EXISTS idx_billing_addons_type;
DROP INDEX IF EXISTS idx_billing_addons_company;
DROP INDEX IF EXISTS idx_usage_metrics_period;
DROP INDEX IF EXISTS idx_usage_metrics_company;
DROP INDEX IF EXISTS idx_billing_history_created;
DROP INDEX IF EXISTS idx_billing_history_status;
DROP INDEX IF EXISTS idx_billing_history_company;
DROP INDEX IF EXISTS idx_company_licenses_period_end;
DROP INDEX IF EXISTS idx_company_licenses_status;
DROP INDEX IF EXISTS idx_company_licenses_plan;
DROP INDEX IF EXISTS idx_company_licenses_company;

-- Drop tables (order matters due to foreign keys)
DROP TABLE IF EXISTS billing_addons;
DROP TABLE IF EXISTS usage_metrics;
DROP TABLE IF EXISTS billing_history;
DROP TABLE IF EXISTS company_licenses;
DROP TABLE IF EXISTS plans;
