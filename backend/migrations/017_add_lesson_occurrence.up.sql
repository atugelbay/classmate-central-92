-- Migration 017: Create lesson_occurrence table
-- Lesson occurrences are materialized lessons generated from schedule rules

-- Create lesson_occurrence table
CREATE TABLE IF NOT EXISTS lesson_occurrence (
    id BIGSERIAL PRIMARY KEY,
    rule_id BIGINT NOT NULL REFERENCES schedule_rule(id) ON DELETE CASCADE,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'moved', 'cancelled', 'done')),
    company_id VARCHAR(255) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_occurrence_time ON lesson_occurrence(starts_at);
CREATE INDEX IF NOT EXISTS idx_occurrence_rule ON lesson_occurrence(rule_id);
CREATE INDEX IF NOT EXISTS idx_occurrence_company ON lesson_occurrence(company_id);
CREATE INDEX IF NOT EXISTS idx_occurrence_status ON lesson_occurrence(status);

-- Migrate data from lessons to lesson_occurrence
-- Link lessons to schedule_rule by group_id
INSERT INTO lesson_occurrence (
    rule_id,
    starts_at,
    ends_at,
    status,
    company_id
)
SELECT 
    sr.id as rule_id,
    l.start_time as starts_at,
    l.end_time as ends_at,
    CASE 
        WHEN l.status = 'completed' THEN 'done'
        WHEN l.status = 'cancelled' THEN 'cancelled'
        ELSE 'scheduled'
    END as status,
    l.company_id
FROM lessons l
LEFT JOIN schedule_rule sr ON sr.owner_type = 'group' AND sr.owner_id = l.group_id
WHERE l.group_id IS NOT NULL
  AND sr.id IS NOT NULL
  AND l.start_time >= CURRENT_DATE - INTERVAL '30 days' -- Only migrate recent lessons
  AND NOT EXISTS (
      SELECT 1 FROM lesson_occurrence lo 
      WHERE lo.starts_at = l.start_time 
      AND lo.ends_at = l.end_time
      AND lo.rule_id = sr.id
  );

-- For lessons without matching schedule_rule, create a temporary rule
-- This handles lessons that don't have corresponding schedule rules
DO $$
DECLARE
    lesson_rec RECORD;
    temp_rule_id BIGINT;
BEGIN
    FOR lesson_rec IN 
        SELECT DISTINCT l.*, g.company_id as group_company_id
        FROM lessons l
        JOIN groups g ON l.group_id = g.id
        WHERE l.group_id IS NOT NULL
          AND l.start_time >= CURRENT_DATE - INTERVAL '30 days'
          AND NOT EXISTS (
              SELECT 1 FROM schedule_rule sr 
              WHERE sr.owner_type = 'group' AND sr.owner_id = l.group_id
          )
          AND NOT EXISTS (
              SELECT 1 FROM lesson_occurrence lo 
              WHERE lo.starts_at = l.start_time 
              AND lo.ends_at = l.end_time
          )
    LOOP
        -- Create a temporary schedule rule for this lesson
        INSERT INTO schedule_rule (
            owner_type,
            owner_id,
            rrule,
            dtstart,
            dtend,
            duration_minutes,
            timezone,
            company_id
        )
        VALUES (
            'group',
            lesson_rec.group_id,
            'FREQ=WEEKLY;BYDAY=' || TO_CHAR(lesson_rec.start_time, 'DY') || 
            ';BYHOUR=' || EXTRACT(HOUR FROM lesson_rec.start_time) || 
            ';BYMINUTE=' || EXTRACT(MINUTE FROM lesson_rec.start_time),
            lesson_rec.start_time,
            NULL,
            EXTRACT(EPOCH FROM (lesson_rec.end_time - lesson_rec.start_time)) / 60,
            'Asia/Almaty',
            lesson_rec.group_company_id
        )
        RETURNING id INTO temp_rule_id;
        
        -- Create lesson_occurrence linked to this rule
        INSERT INTO lesson_occurrence (
            rule_id,
            starts_at,
            ends_at,
            status,
            company_id
        )
        VALUES (
            temp_rule_id,
            lesson_rec.start_time,
            lesson_rec.end_time,
            CASE 
                WHEN lesson_rec.status = 'completed' THEN 'done'
                WHEN lesson_rec.status = 'cancelled' THEN 'cancelled'
                ELSE 'scheduled'
            END,
            lesson_rec.group_company_id
        );
    END LOOP;
END $$;

