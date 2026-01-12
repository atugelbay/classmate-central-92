-- Add lesson_type to lessons table
-- Classifies lessons as: 'group', 'individual', or 'special'

ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS lesson_type VARCHAR(50) CHECK (lesson_type IN ('group', 'individual', 'special'));

-- Update existing lessons based on group_id
-- If group_id IS NULL → 'individual'
-- If group_id IS NOT NULL → 'group'
UPDATE lessons
SET lesson_type = CASE 
    WHEN group_id IS NULL OR group_id = '' THEN 'individual'
    ELSE 'group'
END
WHERE lesson_type IS NULL;

-- Set default value for new lessons
ALTER TABLE lessons
ALTER COLUMN lesson_type SET DEFAULT 'individual';

-- Create index for lesson_type queries
CREATE INDEX IF NOT EXISTS idx_lessons_lesson_type ON lessons(lesson_type);

COMMENT ON COLUMN lessons.lesson_type IS 'Type of lesson: group (has group_id), individual (no group_id), or special (manually assigned)';
