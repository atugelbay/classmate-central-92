-- Migration 016: Rollback schedule_rule table

-- Drop indexes
DROP INDEX IF EXISTS idx_rule_dtstart;
DROP INDEX IF EXISTS idx_rule_company;
DROP INDEX IF EXISTS idx_rule_owner;

-- Drop table
DROP TABLE IF EXISTS schedule_rule;

-- Drop helper function if exists
DROP FUNCTION IF EXISTS day_of_week_to_rrule_byday(INTEGER);

