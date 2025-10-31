-- Migration 016: Create schedule_rule table (RRULE format)
-- Schedule rules store recurring schedule patterns using RFC 5545 RRULE format

-- Helper function to convert day_of_week (1-7, ISO 8601) to RRULE BYDAY format
CREATE OR REPLACE FUNCTION day_of_week_to_rrule_byday(day_num INTEGER) 
RETURNS TEXT AS $$
BEGIN
    CASE day_num
        WHEN 1 THEN RETURN 'MO'; -- Monday
        WHEN 2 THEN RETURN 'TU'; -- Tuesday
        WHEN 3 THEN RETURN 'WE'; -- Wednesday
        WHEN 4 THEN RETURN 'TH'; -- Thursday
        WHEN 5 THEN RETURN 'FR'; -- Friday
        WHEN 6 THEN RETURN 'SA'; -- Saturday
        WHEN 7 THEN RETURN 'SU'; -- Sunday
        ELSE RETURN NULL;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Create schedule_rule table
CREATE TABLE IF NOT EXISTS schedule_rule (
    id BIGSERIAL PRIMARY KEY,
    owner_type TEXT NOT NULL CHECK (owner_type IN ('group', 'individual')),
    owner_id VARCHAR(255) NOT NULL,
    rrule TEXT NOT NULL,
    dtstart TIMESTAMPTZ NOT NULL,
    dtend TIMESTAMPTZ,
    duration_minutes INTEGER NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'Asia/Almaty',
    location TEXT,
    company_id VARCHAR(255) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rule_owner ON schedule_rule(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_rule_company ON schedule_rule(company_id);
CREATE INDEX IF NOT EXISTS idx_rule_dtstart ON schedule_rule(dtstart);

-- Migrate data from group_schedule to schedule_rule
-- Convert group_schedule entries to RRULE format
INSERT INTO schedule_rule (
    owner_type,
    owner_id,
    rrule,
    dtstart,
    dtend,
    duration_minutes,
    timezone,
    location,
    company_id
)
SELECT DISTINCT ON (gs.group_id, gs.day_of_week, gs.time_from, gs.time_to)
    'group' as owner_type,
    gs.group_id as owner_id,
    -- Build RRULE: FREQ=WEEKLY;BYDAY=MO,WE;BYHOUR=18;BYMINUTE=30
    'FREQ=WEEKLY;BYDAY=' || day_of_week_to_rrule_byday(gs.day_of_week) || 
    ';BYHOUR=' || EXTRACT(HOUR FROM gs.time_from) || 
    ';BYMINUTE=' || EXTRACT(MINUTE FROM gs.time_from) as rrule,
    -- Combine start_date and time_from for dtstart
    (gs.start_date + gs.time_from)::TIMESTAMPTZ as dtstart,
    -- Combine end_date and time_to for dtend (or NULL if far in future)
    CASE 
        WHEN gs.end_date > CURRENT_DATE + INTERVAL '1 year' THEN NULL
        ELSE (gs.end_date + gs.time_to)::TIMESTAMPTZ
    END as dtend,
    -- Calculate duration in minutes
    EXTRACT(EPOCH FROM (gs.time_to - gs.time_from)) / 60 as duration_minutes,
    'Asia/Almaty' as timezone,
    NULL as location,
    gs.company_id
FROM group_schedule gs
WHERE gs.is_active = true
AND NOT EXISTS (
    SELECT 1 FROM schedule_rule sr 
    WHERE sr.owner_type = 'group' 
    AND sr.owner_id = gs.group_id
    AND sr.rrule LIKE '%BYDAY=' || day_of_week_to_rrule_byday(gs.day_of_week) || '%'
);

-- For groups with multiple days per week, we create separate rules per day
-- Future enhancement: combine multiple days into single RRULE with multiple BYDAY values

-- Drop helper function (no longer needed after migration)
DROP FUNCTION IF EXISTS day_of_week_to_rrule_byday(INTEGER);

