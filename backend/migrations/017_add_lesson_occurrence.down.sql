-- Migration 017: Rollback lesson_occurrence table

-- Drop indexes
DROP INDEX IF EXISTS idx_occurrence_status;
DROP INDEX IF EXISTS idx_occurrence_company;
DROP INDEX IF EXISTS idx_occurrence_rule;
DROP INDEX IF EXISTS idx_occurrence_time;

-- Drop table
DROP TABLE IF EXISTS lesson_occurrence;

