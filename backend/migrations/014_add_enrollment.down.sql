-- Migration 014: Rollback enrollment table

-- Drop indexes
DROP INDEX IF EXISTS idx_enrollment_left_at;
DROP INDEX IF EXISTS idx_enrollment_joined_at;
DROP INDEX IF EXISTS idx_enrollment_company;
DROP INDEX IF EXISTS idx_enrollment_group;
DROP INDEX IF EXISTS idx_enrollment_student;
DROP INDEX IF EXISTS ux_enrollment_unique;

-- Drop table
DROP TABLE IF EXISTS enrollment;

