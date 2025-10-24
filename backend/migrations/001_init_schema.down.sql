-- Drop indexes
DROP INDEX IF EXISTS idx_groups_teacher;
DROP INDEX IF EXISTS idx_lessons_time;
DROP INDEX IF EXISTS idx_lessons_group;
DROP INDEX IF EXISTS idx_lessons_teacher;
DROP INDEX IF EXISTS idx_students_email;
DROP INDEX IF EXISTS idx_teachers_email;

-- Drop tables in reverse order
DROP TABLE IF EXISTS lesson_students;
DROP TABLE IF EXISTS student_groups;
DROP TABLE IF EXISTS student_subjects;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS lessons;
DROP TABLE IF EXISTS groups;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS teachers;
DROP TABLE IF EXISTS users;

