-- Remove lesson_type from lessons table

DROP INDEX IF EXISTS idx_lessons_lesson_type;

ALTER TABLE lessons
DROP COLUMN IF EXISTS lesson_type;
