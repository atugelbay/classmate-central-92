-- Drop indexes
DROP INDEX IF EXISTS idx_lesson_attendance_status;
DROP INDEX IF EXISTS idx_lesson_attendance_subscription;
DROP INDEX IF EXISTS idx_lesson_attendance_student;
DROP INDEX IF EXISTS idx_lesson_attendance_lesson;

DROP INDEX IF EXISTS idx_student_subscriptions_dates;
DROP INDEX IF EXISTS idx_student_subscriptions_status;
DROP INDEX IF EXISTS idx_student_subscriptions_group;
DROP INDEX IF EXISTS idx_student_subscriptions_student;

DROP INDEX IF EXISTS idx_group_schedule_active;
DROP INDEX IF EXISTS idx_group_schedule_day;
DROP INDEX IF EXISTS idx_group_schedule_group;

-- Drop columns from lesson_attendance (if they were added)
ALTER TABLE lesson_attendance DROP COLUMN IF EXISTS grade;
ALTER TABLE lesson_attendance DROP COLUMN IF EXISTS note;
ALTER TABLE lesson_attendance DROP COLUMN IF EXISTS is_attended;
ALTER TABLE lesson_attendance DROP COLUMN IF EXISTS commission_amount;
ALTER TABLE lesson_attendance DROP COLUMN IF EXISTS subscription_id;

-- Drop tables
DROP TABLE IF EXISTS lesson_attendance;
DROP TABLE IF EXISTS student_subscriptions;
DROP TABLE IF EXISTS group_schedule;

