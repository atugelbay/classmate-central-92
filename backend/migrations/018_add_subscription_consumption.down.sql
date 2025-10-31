-- Migration 018: Rollback subscription_consumption table

-- Drop indexes
DROP INDEX IF EXISTS idx_subscription_consumption_created_at;
DROP INDEX IF EXISTS idx_subscription_consumption_company;
DROP INDEX IF EXISTS idx_subscription_consumption_attendance;
DROP INDEX IF EXISTS idx_subscription_consumption_subscription;
DROP INDEX IF EXISTS ux_sub_charge;

-- Drop table
DROP TABLE IF EXISTS subscription_consumption;

