-- Remove version columns and indexes
DROP INDEX IF EXISTS idx_student_subscriptions_version;
DROP INDEX IF EXISTS idx_student_balance_version;
ALTER TABLE student_subscriptions DROP COLUMN IF EXISTS version;
ALTER TABLE student_balance DROP COLUMN IF EXISTS version;

