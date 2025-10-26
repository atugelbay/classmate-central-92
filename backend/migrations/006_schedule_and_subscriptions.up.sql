-- Group Schedule (Regular Lessons / Расписание групп)
CREATE TABLE IF NOT EXISTS group_schedule (
    id VARCHAR(255) PRIMARY KEY,  -- regular_id из AlfaCRM
    group_id VARCHAR(255) REFERENCES groups(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),  -- 0=Sunday, 1=Monday, etc.
    time_from TIME NOT NULL,
    time_to TIME NOT NULL,
    teacher_id VARCHAR(255) REFERENCES teachers(id) ON DELETE SET NULL,
    room_id VARCHAR(255) REFERENCES rooms(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student Subscriptions (Абонементы / CTT)
CREATE TABLE IF NOT EXISTS student_subscriptions (
    id VARCHAR(255) PRIMARY KEY,  -- ctt_id из AlfaCRM
    student_id VARCHAR(255) REFERENCES students(id) ON DELETE CASCADE,
    group_id VARCHAR(255) REFERENCES groups(id) ON DELETE SET NULL,
    teacher_id VARCHAR(255) REFERENCES teachers(id) ON DELETE SET NULL,
    
    -- Количество занятий
    total_lessons INTEGER NOT NULL DEFAULT 0,       -- Всего оплачено
    used_lessons INTEGER NOT NULL DEFAULT 0,         -- Использовано
    remaining_lessons INTEGER GENERATED ALWAYS AS (total_lessons - used_lessons) STORED,
    
    -- Стоимость
    total_price DECIMAL(10, 2) NOT NULL DEFAULT 0,  -- Общая стоимость
    price_per_lesson DECIMAL(10, 2) NOT NULL DEFAULT 0,  -- Стоимость за занятие
    
    -- Сроки
    start_date DATE,
    end_date DATE,
    paid_till DATE,  -- Оплачено до (из customer.paid_till)
    
    -- Статус
    status VARCHAR(50) DEFAULT 'active',  -- active, completed, expired, frozen
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lesson Attendance (Обновленная посещаемость с абонементом)
-- Сначала проверим, существует ли таблица
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lesson_attendance') THEN
        CREATE TABLE lesson_attendance (
            id SERIAL PRIMARY KEY,
            lesson_id VARCHAR(255) REFERENCES lessons(id) ON DELETE CASCADE,
            student_id VARCHAR(255) REFERENCES students(id) ON DELETE CASCADE,
            subscription_id VARCHAR(255) REFERENCES student_subscriptions(id) ON DELETE SET NULL,
            
            -- Посещаемость
            status VARCHAR(50) DEFAULT 'scheduled',  -- scheduled, attended, absent, cancelled
            is_attended BOOLEAN DEFAULT false,
            
            -- Финансы
            commission_amount DECIMAL(10, 2) DEFAULT 0,  -- Сумма списания с абонемента
            
            -- Дополнительно
            note TEXT,
            grade VARCHAR(10),  -- Оценка
            
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            UNIQUE(lesson_id, student_id)
        );
    ELSE
        -- Если таблица существует, добавляем недостающие колонки
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lesson_attendance' AND column_name = 'subscription_id') THEN
            ALTER TABLE lesson_attendance ADD COLUMN subscription_id VARCHAR(255) REFERENCES student_subscriptions(id) ON DELETE SET NULL;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lesson_attendance' AND column_name = 'commission_amount') THEN
            ALTER TABLE lesson_attendance ADD COLUMN commission_amount DECIMAL(10, 2) DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lesson_attendance' AND column_name = 'is_attended') THEN
            ALTER TABLE lesson_attendance ADD COLUMN is_attended BOOLEAN DEFAULT false;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lesson_attendance' AND column_name = 'note') THEN
            ALTER TABLE lesson_attendance ADD COLUMN note TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lesson_attendance' AND column_name = 'grade') THEN
            ALTER TABLE lesson_attendance ADD COLUMN grade VARCHAR(10);
        END IF;
    END IF;
END$$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_schedule_group ON group_schedule(group_id);
CREATE INDEX IF NOT EXISTS idx_group_schedule_day ON group_schedule(day_of_week);
CREATE INDEX IF NOT EXISTS idx_group_schedule_active ON group_schedule(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_student_subscriptions_student ON student_subscriptions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_group ON student_subscriptions(group_id);
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_status ON student_subscriptions(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_dates ON student_subscriptions(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_lesson_attendance_lesson ON lesson_attendance(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_attendance_student ON lesson_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_attendance_subscription ON lesson_attendance(subscription_id);
CREATE INDEX IF NOT EXISTS idx_lesson_attendance_status ON lesson_attendance(status);


