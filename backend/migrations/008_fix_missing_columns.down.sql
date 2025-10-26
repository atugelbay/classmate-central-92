-- Migration 008 Down: Remove added columns

-- Remove foreign key constraints
ALTER TABLE groups DROP CONSTRAINT IF EXISTS fk_groups_company;
ALTER TABLE group_schedule DROP CONSTRAINT IF EXISTS fk_group_schedule_company;
ALTER TABLE student_subscriptions DROP CONSTRAINT IF EXISTS fk_student_subscriptions_company;
ALTER TABLE debt_records DROP CONSTRAINT IF EXISTS fk_debt_records_company;
ALTER TABLE lesson_students DROP CONSTRAINT IF EXISTS fk_lesson_students_company;

-- Remove company_id columns
ALTER TABLE groups DROP COLUMN IF EXISTS company_id;
ALTER TABLE group_schedule DROP COLUMN IF EXISTS company_id;
ALTER TABLE student_subscriptions DROP COLUMN IF EXISTS company_id;
ALTER TABLE payment_transactions DROP COLUMN IF EXISTS company_id;
ALTER TABLE debt_records DROP COLUMN IF EXISTS company_id;
ALTER TABLE lesson_students DROP COLUMN IF EXISTS company_id;

-- Remove other added columns
ALTER TABLE groups DROP COLUMN IF EXISTS description;
ALTER TABLE groups DROP COLUMN IF EXISTS status;
ALTER TABLE groups DROP COLUMN IF EXISTS color;

ALTER TABLE group_schedule DROP COLUMN IF EXISTS start_date;
ALTER TABLE group_schedule DROP COLUMN IF EXISTS end_date;
