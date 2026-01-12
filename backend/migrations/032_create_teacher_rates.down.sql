-- Remove teacher_rates table

DROP INDEX IF EXISTS idx_teacher_rates_branch;
DROP INDEX IF EXISTS idx_teacher_rates_company;
DROP INDEX IF EXISTS idx_teacher_rates_active;
DROP INDEX IF EXISTS idx_teacher_rates_lesson_type;
DROP INDEX IF EXISTS idx_teacher_rates_teacher;

DROP TABLE IF EXISTS teacher_rates;
