-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teachers table
CREATE TABLE IF NOT EXISTS teachers (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    avatar TEXT,
    workload INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    age INTEGER NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    avatar TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    teacher_id VARCHAR(255) REFERENCES teachers(id) ON DELETE SET NULL,
    schedule TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lessons table
CREATE TABLE IF NOT EXISTS lessons (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    teacher_id VARCHAR(255) REFERENCES teachers(id) ON DELETE CASCADE,
    group_id VARCHAR(255) REFERENCES groups(id) ON DELETE SET NULL,
    subject VARCHAR(255) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    room VARCHAR(255),
    status VARCHAR(50) DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student subjects (many-to-many)
CREATE TABLE IF NOT EXISTS student_subjects (
    student_id VARCHAR(255) REFERENCES students(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    PRIMARY KEY (student_id, subject)
);

-- Student groups (many-to-many)
CREATE TABLE IF NOT EXISTS student_groups (
    student_id VARCHAR(255) REFERENCES students(id) ON DELETE CASCADE,
    group_id VARCHAR(255) REFERENCES groups(id) ON DELETE CASCADE,
    PRIMARY KEY (student_id, group_id)
);

-- Lesson students (many-to-many)
CREATE TABLE IF NOT EXISTS lesson_students (
    lesson_id VARCHAR(255) REFERENCES lessons(id) ON DELETE CASCADE,
    student_id VARCHAR(255) REFERENCES students(id) ON DELETE CASCADE,
    PRIMARY KEY (lesson_id, student_id)
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    center_name VARCHAR(255) NOT NULL,
    logo TEXT,
    theme_color VARCHAR(50) DEFAULT '#8B5CF6'
);

-- Insert default settings
INSERT INTO settings (center_name, theme_color) 
VALUES ('Образовательный Центр', '#8B5CF6')
ON CONFLICT DO NOTHING;

-- Create indexes for better performance (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_teachers_email ON teachers(email);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_lessons_teacher ON lessons(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lessons_group ON lessons(group_id);
CREATE INDEX IF NOT EXISTS idx_lessons_time ON lessons(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_groups_teacher ON groups(teacher_id);

