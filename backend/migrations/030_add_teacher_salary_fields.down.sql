-- Remove salary/payment rate fields from teachers table

DROP INDEX IF EXISTS idx_teachers_rate_type;

ALTER TABLE teachers
DROP COLUMN IF EXISTS lesson_rate,
DROP COLUMN IF EXISTS hourly_rate,
DROP COLUMN IF EXISTS rate_type;
