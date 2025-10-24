-- Drop indexes
DROP INDEX IF EXISTS idx_lead_tasks_due;
DROP INDEX IF EXISTS idx_lead_tasks_status;
DROP INDEX IF EXISTS idx_lead_tasks_lead;
DROP INDEX IF EXISTS idx_lead_activities_lead;
DROP INDEX IF EXISTS idx_leads_assigned;
DROP INDEX IF EXISTS idx_leads_source;
DROP INDEX IF EXISTS idx_leads_status;
DROP INDEX IF EXISTS idx_lessons_room;

-- Drop tables
DROP TABLE IF EXISTS lead_tasks;
DROP TABLE IF EXISTS lead_activities;
DROP TABLE IF EXISTS leads;

-- Remove room_id from lessons
ALTER TABLE lessons DROP COLUMN IF EXISTS room_id;

-- Drop rooms table
DROP TABLE IF EXISTS rooms;

