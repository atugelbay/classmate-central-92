-- Migration 015: Rollback individual_enrollment table

-- Drop indexes
DROP INDEX IF EXISTS idx_individual_enrollment_active;
DROP INDEX IF EXISTS idx_individual_enrollment_ended_at;
DROP INDEX IF EXISTS idx_individual_enrollment_started_at;
DROP INDEX IF EXISTS idx_individual_enrollment_company;
DROP INDEX IF EXISTS idx_individual_enrollment_teacher;
DROP INDEX IF EXISTS idx_individual_enrollment_student;

-- Drop table
DROP TABLE IF EXISTS individual_enrollment;

