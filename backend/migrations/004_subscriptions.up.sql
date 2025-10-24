-- Subscription types (абонементы)
CREATE TABLE IF NOT EXISTS subscription_types (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    lessons_count INTEGER NOT NULL,
    validity_days INTEGER, -- срок действия в днях, NULL = неограничен
    price DECIMAL(10, 2) NOT NULL,
    can_freeze BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student subscriptions (назначенные абонементы)
CREATE TABLE IF NOT EXISTS student_subscriptions (
    id VARCHAR(255) PRIMARY KEY,
    student_id VARCHAR(255) REFERENCES students(id) ON DELETE CASCADE,
    subscription_type_id VARCHAR(255) REFERENCES subscription_types(id) ON DELETE CASCADE,
    lessons_remaining INTEGER NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP, -- может быть NULL если нет срока действия
    status VARCHAR(50) DEFAULT 'active', -- active, expired, frozen
    freeze_days_remaining INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscription freezes (история заморозок)
CREATE TABLE IF NOT EXISTS subscription_freezes (
    id SERIAL PRIMARY KEY,
    subscription_id VARCHAR(255) REFERENCES student_subscriptions(id) ON DELETE CASCADE,
    freeze_start TIMESTAMP NOT NULL,
    freeze_end TIMESTAMP, -- NULL если еще не разморожен
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lesson attendance (посещаемость и списание с абонементов)
CREATE TABLE IF NOT EXISTS lesson_attendance (
    id SERIAL PRIMARY KEY,
    lesson_id VARCHAR(255) REFERENCES lessons(id) ON DELETE CASCADE,
    student_id VARCHAR(255) REFERENCES students(id) ON DELETE CASCADE,
    subscription_id VARCHAR(255) REFERENCES student_subscriptions(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'attended', -- attended, missed, cancelled
    marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    marked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(lesson_id, student_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_student ON student_subscriptions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_status ON student_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscription_freezes_subscription ON subscription_freezes(subscription_id);
CREATE INDEX IF NOT EXISTS idx_lesson_attendance_lesson ON lesson_attendance(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_attendance_student ON lesson_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_attendance_subscription ON lesson_attendance(subscription_id);

