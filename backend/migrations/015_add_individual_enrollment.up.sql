-- Migration 015: Create individual_enrollment table
-- Individual enrollment tracks student-teacher individual lessons relationship

-- Create individual_enrollment table
CREATE TABLE IF NOT EXISTS individual_enrollment (
    id BIGSERIAL PRIMARY KEY,
    student_id VARCHAR(255) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    teacher_id VARCHAR(255) NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    company_id VARCHAR(255) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_individual_enrollment_student ON individual_enrollment(student_id);
CREATE INDEX IF NOT EXISTS idx_individual_enrollment_teacher ON individual_enrollment(teacher_id);
CREATE INDEX IF NOT EXISTS idx_individual_enrollment_company ON individual_enrollment(company_id);
CREATE INDEX IF NOT EXISTS idx_individual_enrollment_started_at ON individual_enrollment(started_at);
CREATE INDEX IF NOT EXISTS idx_individual_enrollment_ended_at ON individual_enrollment(ended_at) WHERE ended_at IS NOT NULL;

-- Create composite index for active enrollments (student-teacher combination)
CREATE INDEX IF NOT EXISTS idx_individual_enrollment_active 
ON individual_enrollment(student_id, teacher_id, ended_at) 
WHERE ended_at IS NULL;

