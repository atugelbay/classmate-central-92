-- Migration 010: Enhance student_subscriptions with flexible pricing and tracking

-- Add group_id to link subscription to a specific group
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='student_subscriptions' AND column_name='group_id') THEN
        ALTER TABLE student_subscriptions ADD COLUMN group_id VARCHAR(255) REFERENCES groups(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add teacher_id to link subscription to a specific teacher
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='student_subscriptions' AND column_name='teacher_id') THEN
        ALTER TABLE student_subscriptions ADD COLUMN teacher_id VARCHAR(255) REFERENCES teachers(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add total_lessons to track the original lesson count
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='student_subscriptions' AND column_name='total_lessons') THEN
        ALTER TABLE student_subscriptions ADD COLUMN total_lessons INTEGER DEFAULT 0;
        -- Set initial value from lessons_remaining for existing records
        UPDATE student_subscriptions SET total_lessons = lessons_remaining WHERE total_lessons = 0;
    END IF;
END $$;

-- Add used_lessons to track how many lessons have been used
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='student_subscriptions' AND column_name='used_lessons') THEN
        ALTER TABLE student_subscriptions ADD COLUMN used_lessons INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add total_price for flexible subscription pricing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='student_subscriptions' AND column_name='total_price') THEN
        ALTER TABLE student_subscriptions ADD COLUMN total_price DECIMAL(10, 2) DEFAULT 0;
    END IF;
END $$;

-- Add price_per_lesson for tracking per-lesson cost
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='student_subscriptions' AND column_name='price_per_lesson') THEN
        ALTER TABLE student_subscriptions ADD COLUMN price_per_lesson DECIMAL(10, 2) DEFAULT 0;
    END IF;
END $$;

-- Add paid_till for monthly subscriptions
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='student_subscriptions' AND column_name='paid_till') THEN
        ALTER TABLE student_subscriptions ADD COLUMN paid_till TIMESTAMP;
    END IF;
END $$;

-- Add updated_at to track last modification
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='student_subscriptions' AND column_name='updated_at') THEN
        ALTER TABLE student_subscriptions ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Add remaining_lessons as a generated column (computed from total_lessons - used_lessons)
-- First, check if lessons_remaining exists and is not a generated column
DO $$ 
BEGIN
    -- Drop the old lessons_remaining column if it exists and is not generated
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='student_subscriptions' AND column_name='lessons_remaining') THEN
        -- Drop and recreate as a generated column
        ALTER TABLE student_subscriptions DROP COLUMN lessons_remaining;
    END IF;
    
    -- Add as a generated column with NULL handling
    ALTER TABLE student_subscriptions 
    ADD COLUMN remaining_lessons INTEGER GENERATED ALWAYS AS (COALESCE(total_lessons, 0) - COALESCE(used_lessons, 0)) STORED;
END $$;

-- Create indexes for new foreign keys
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_group ON student_subscriptions(group_id);
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_teacher ON student_subscriptions(teacher_id);

-- Update existing records to calculate price information from subscription_types
UPDATE student_subscriptions ss
SET 
    total_price = COALESCE(st.price, 0),
    price_per_lesson = CASE 
        WHEN st.lessons_count > 0 THEN st.price / st.lessons_count 
        ELSE 0 
    END
FROM subscription_types st
WHERE ss.subscription_type_id = st.id 
  AND ss.total_price = 0;

