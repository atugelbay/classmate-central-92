-- Group Schedule (Regular Lessons / Расписание групп)
CREATE TABLE IF NOT EXISTS group_schedule (
    id VARCHAR(255) PRIMARY KEY,  -- regular_id из AlfaCRM
    group_id VARCHAR(255) REFERENCES groups(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),  -- 1=Monday, 7=Sunday (ISO 8601)
    time_from TIME NOT NULL,
    time_to TIME NOT NULL,
    teacher_id VARCHAR(255) REFERENCES teachers(id) ON DELETE SET NULL,
    room_id VARCHAR(255) REFERENCES rooms(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    company_id VARCHAR(255) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_schedule_group ON group_schedule(group_id);
CREATE INDEX IF NOT EXISTS idx_group_schedule_day ON group_schedule(day_of_week);
CREATE INDEX IF NOT EXISTS idx_group_schedule_active ON group_schedule(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_group_schedule_company ON group_schedule(company_id);

