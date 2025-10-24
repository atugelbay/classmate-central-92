-- Rooms table for classrooms/auditoriums
CREATE TABLE IF NOT EXISTS rooms (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    capacity INTEGER DEFAULT 0,
    color VARCHAR(50) DEFAULT '#8B5CF6',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add room_id to lessons table
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS room_id VARCHAR(255) REFERENCES rooms(id) ON DELETE SET NULL;

-- Create index for room_id in lessons
CREATE INDEX IF NOT EXISTS idx_lessons_room ON lessons(room_id);

-- Leads table for potential students
CREATE TABLE IF NOT EXISTS leads (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    source VARCHAR(100) NOT NULL, -- call, website, social, referral, other
    status VARCHAR(50) DEFAULT 'new', -- new, in_progress, enrolled, rejected
    notes TEXT,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lead activities (history of interactions)
CREATE TABLE IF NOT EXISTS lead_activities (
    id SERIAL PRIMARY KEY,
    lead_id VARCHAR(255) REFERENCES leads(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- call, meeting, note, email
    description TEXT NOT NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lead tasks (follow-up actions)
CREATE TABLE IF NOT EXISTS lead_tasks (
    id SERIAL PRIMARY KEY,
    lead_id VARCHAR(255) REFERENCES leads(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_lead ON lead_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_status ON lead_tasks(status);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_due ON lead_tasks(due_date);

