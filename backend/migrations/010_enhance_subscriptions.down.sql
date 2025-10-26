-- Migration 010 DOWN: Remove enhancements to student_subscriptions

-- Drop generated column
ALTER TABLE student_subscriptions DROP COLUMN IF EXISTS remaining_lessons;

-- Re-add lessons_remaining as a regular column
ALTER TABLE student_subscriptions ADD COLUMN IF NOT EXISTS lessons_remaining INTEGER DEFAULT 0;

-- Drop indexes
DROP INDEX IF EXISTS idx_student_subscriptions_group;
DROP INDEX IF EXISTS idx_student_subscriptions_teacher;

-- Drop new columns
ALTER TABLE student_subscriptions DROP COLUMN IF EXISTS updated_at;
ALTER TABLE student_subscriptions DROP COLUMN IF EXISTS paid_till;
ALTER TABLE student_subscriptions DROP COLUMN IF EXISTS price_per_lesson;
ALTER TABLE student_subscriptions DROP COLUMN IF EXISTS total_price;
ALTER TABLE student_subscriptions DROP COLUMN IF EXISTS used_lessons;
ALTER TABLE student_subscriptions DROP COLUMN IF EXISTS total_lessons;
ALTER TABLE student_subscriptions DROP COLUMN IF EXISTS teacher_id;
ALTER TABLE student_subscriptions DROP COLUMN IF EXISTS group_id;

