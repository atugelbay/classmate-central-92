-- Remove billing_type from subscription_types
DROP INDEX IF EXISTS idx_subscription_types_billing_type;
ALTER TABLE subscription_types DROP COLUMN IF EXISTS billing_type;

