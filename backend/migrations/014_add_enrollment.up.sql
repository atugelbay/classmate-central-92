-- Migration 014: Create enrollment table (replaces/extends student_groups)
-- Enrollment tracks student-group membership with timestamps

-- Create enrollment table
CREATE TABLE IF NOT EXISTS enrollment (
    id BIGSERIAL PRIMARY KEY,
    student_id VARCHAR(255) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    group_id VARCHAR(255) NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    left_at TIMESTAMPTZ,
    company_id VARCHAR(255) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create unique index for active enrollments (one active enrollment per student-group)
CREATE UNIQUE INDEX IF NOT EXISTS ux_enrollment_unique 
ON enrollment(student_id, group_id) 
WHERE left_at IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_enrollment_student ON enrollment(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_group ON enrollment(group_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_company ON enrollment(company_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_joined_at ON enrollment(joined_at);
CREATE INDEX IF NOT EXISTS idx_enrollment_left_at ON enrollment(left_at) WHERE left_at IS NOT NULL;

-- Migrate data from student_groups to enrollment
-- Get company_id from groups table
INSERT INTO enrollment (student_id, group_id, joined_at, company_id)
SELECT 
    sg.student_id,
    sg.group_id,
    now() as joined_at,
    COALESCE(g.company_id, 'default-company') as company_id
FROM student_groups sg
LEFT JOIN groups g ON sg.group_id = g.id
WHERE NOT EXISTS (
    SELECT 1 FROM enrollment e 
    WHERE e.student_id = sg.student_id 
    AND e.group_id = sg.group_id
    AND e.left_at IS NULL
)
ON CONFLICT DO NOTHING;

