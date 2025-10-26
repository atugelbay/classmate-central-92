-- Drop indexes
DROP INDEX IF EXISTS idx_notifications_type;
DROP INDEX IF EXISTS idx_notifications_is_read;
DROP INDEX IF EXISTS idx_notifications_student;
DROP INDEX IF EXISTS idx_student_notes_created;
DROP INDEX IF EXISTS idx_student_notes_student;
DROP INDEX IF EXISTS idx_student_activity_log_created;
DROP INDEX IF EXISTS idx_student_activity_log_type;
DROP INDEX IF EXISTS idx_student_activity_log_student;
DROP INDEX IF EXISTS idx_students_status;

-- Drop tables
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS student_notes;
DROP TABLE IF EXISTS student_activity_log;

-- Remove columns from lesson_attendance
ALTER TABLE lesson_attendance DROP COLUMN IF EXISTS notes;
ALTER TABLE lesson_attendance DROP COLUMN IF EXISTS reason;

-- Remove status from students
ALTER TABLE students DROP COLUMN IF EXISTS status;

