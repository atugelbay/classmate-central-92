-- Remove discount tracking columns from student_subscriptions

DROP INDEX IF EXISTS idx_student_subscriptions_original_price;

ALTER TABLE student_subscriptions
DROP COLUMN IF EXISTS discount_amount,
DROP COLUMN IF EXISTS original_price;
