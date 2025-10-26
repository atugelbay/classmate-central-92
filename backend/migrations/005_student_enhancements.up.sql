-- Add status field to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Add reason and notes to lesson_attendance
ALTER TABLE lesson_attendance ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE lesson_attendance ADD COLUMN IF NOT EXISTS notes TEXT;

-- Student activity log table
CREATE TABLE IF NOT EXISTS student_activity_log (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(255) REFERENCES students(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- payment, attendance, subscription_change, status_change, note, debt_created, freeze
    description TEXT NOT NULL,
    metadata JSONB, -- additional data in JSON format
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student notes table
CREATE TABLE IF NOT EXISTS student_notes (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(255) REFERENCES students(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(255) REFERENCES students(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- debt_reminder, subscription_expiring, subscription_expired
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_student_activity_log_student ON student_activity_log(student_id);
CREATE INDEX IF NOT EXISTS idx_student_activity_log_type ON student_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_student_activity_log_created ON student_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_notes_student ON student_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_student_notes_created ON student_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_student ON notifications(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

