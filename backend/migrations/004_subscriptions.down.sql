-- Drop indexes
DROP INDEX IF EXISTS idx_lesson_attendance_subscription;
DROP INDEX IF EXISTS idx_lesson_attendance_student;
DROP INDEX IF EXISTS idx_lesson_attendance_lesson;
DROP INDEX IF EXISTS idx_subscription_freezes_subscription;
DROP INDEX IF EXISTS idx_student_subscriptions_status;
DROP INDEX IF EXISTS idx_student_subscriptions_student;

-- Drop tables
DROP TABLE IF EXISTS lesson_attendance;
DROP TABLE IF EXISTS subscription_freezes;
DROP TABLE IF EXISTS student_subscriptions;
DROP TABLE IF EXISTS subscription_types;

