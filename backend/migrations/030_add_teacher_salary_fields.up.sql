-- Add salary/payment rate fields to teachers table
-- Allows tracking hourly rate or per-lesson rate for salary calculation

ALTER TABLE teachers
ADD COLUMN IF NOT EXISTS rate_type VARCHAR(50) CHECK (rate_type IN ('hourly', 'per_lesson')) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS lesson_rate DECIMAL(10, 2) DEFAULT NULL;

-- Create index for rate_type queries
CREATE INDEX IF NOT EXISTS idx_teachers_rate_type ON teachers(rate_type);

COMMENT ON COLUMN teachers.rate_type IS 'Type of payment rate: hourly or per_lesson';
COMMENT ON COLUMN teachers.hourly_rate IS 'Hourly rate in currency (e.g., 2000 tenge/hour)';
COMMENT ON COLUMN teachers.lesson_rate IS 'Rate per lesson in currency (e.g., 2500 tenge/lesson)';
