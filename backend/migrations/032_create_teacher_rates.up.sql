-- Create teacher_rates table
-- Allows teachers to have different rates for different lesson types (group/individual/special)

CREATE TABLE IF NOT EXISTS teacher_rates (
    id VARCHAR(255) PRIMARY KEY,
    teacher_id VARCHAR(255) NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    lesson_type VARCHAR(50) NOT NULL CHECK (lesson_type IN ('group', 'individual', 'special')),
    rate_type VARCHAR(50) NOT NULL CHECK (rate_type IN ('hourly', 'per_lesson')),
    rate_value DECIMAL(10, 2) NOT NULL CHECK (rate_value > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    company_id VARCHAR(255) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id VARCHAR(255) REFERENCES branches(id) ON DELETE CASCADE,
    -- Ensure one active rate of each type per lesson type per teacher
    UNIQUE(teacher_id, lesson_type, rate_type, company_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_teacher_rates_teacher ON teacher_rates(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_rates_lesson_type ON teacher_rates(lesson_type);
CREATE INDEX IF NOT EXISTS idx_teacher_rates_active ON teacher_rates(is_active);
CREATE INDEX IF NOT EXISTS idx_teacher_rates_company ON teacher_rates(company_id);
CREATE INDEX IF NOT EXISTS idx_teacher_rates_branch ON teacher_rates(branch_id);

COMMENT ON TABLE teacher_rates IS 'Stores payment rates for teachers by lesson type';
COMMENT ON COLUMN teacher_rates.lesson_type IS 'Type of lesson: group, individual, or special';
COMMENT ON COLUMN teacher_rates.rate_type IS 'Type of rate: hourly or per_lesson';
COMMENT ON COLUMN teacher_rates.rate_value IS 'Rate value in currency (e.g., 2000 tenge/hour or 2500 tenge/lesson)';
