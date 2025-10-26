-- Migration 008: Add missing columns for multi-tenancy and AlfaCRM migration

-- Add missing columns to groups table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='groups' AND column_name='description') THEN
        ALTER TABLE groups ADD COLUMN description TEXT DEFAULT '';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='groups' AND column_name='status') THEN
        ALTER TABLE groups ADD COLUMN status VARCHAR(50) DEFAULT 'active';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='groups' AND column_name='color') THEN
        ALTER TABLE groups ADD COLUMN color VARCHAR(50) DEFAULT '#3b82f6';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='groups' AND column_name='company_id') THEN
        ALTER TABLE groups ADD COLUMN company_id VARCHAR(255);
    END IF;
END $$;

-- Add start_date and end_date to group_schedule (make them nullable) - only if table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='group_schedule') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='group_schedule' AND column_name='start_date') THEN
            ALTER TABLE group_schedule ADD COLUMN start_date DATE;
        END IF;
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='group_schedule') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='group_schedule' AND column_name='end_date') THEN
            ALTER TABLE group_schedule ADD COLUMN end_date DATE;
        END IF;
    END IF;
END $$;

-- Add company_id to group_schedule - only if table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='group_schedule') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='group_schedule' AND column_name='company_id') THEN
            ALTER TABLE group_schedule ADD COLUMN company_id VARCHAR(255);
        END IF;
    END IF;
END $$;

-- Add company_id to student_subscriptions
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='student_subscriptions' AND column_name='company_id') THEN
        ALTER TABLE student_subscriptions ADD COLUMN company_id VARCHAR(255);
    END IF;
END $$;

-- Add company_id to payment_transactions
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='payment_transactions' AND column_name='company_id') THEN
        ALTER TABLE payment_transactions ADD COLUMN company_id VARCHAR(255);
    END IF;
END $$;

-- Add company_id to debt_records
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='debt_records' AND column_name='company_id') THEN
        ALTER TABLE debt_records ADD COLUMN company_id VARCHAR(255);
    END IF;
END $$;

-- Add company_id to lesson_students
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='lesson_students' AND column_name='company_id') THEN
        ALTER TABLE lesson_students ADD COLUMN company_id VARCHAR(255);
    END IF;
END $$;

-- Update existing records with default company_id (only if company_id is NULL)
UPDATE groups SET company_id = 'default-company' WHERE company_id IS NULL;

-- Update group_schedule only if table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='group_schedule') THEN
        UPDATE group_schedule SET company_id = 'default-company' WHERE company_id IS NULL;
    END IF;
END $$;

UPDATE student_subscriptions SET company_id = 'default-company' WHERE company_id IS NULL;
UPDATE payment_transactions SET company_id = 'default-company' WHERE company_id IS NULL;
UPDATE debt_records SET company_id = 'default-company' WHERE company_id IS NULL;
UPDATE lesson_students SET company_id = 'default-company' WHERE company_id IS NULL;

-- Add foreign key constraints to companies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_groups_company') THEN
        ALTER TABLE groups ADD CONSTRAINT fk_groups_company 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='group_schedule') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_group_schedule_company') THEN
            ALTER TABLE group_schedule ADD CONSTRAINT fk_group_schedule_company 
            FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_subscriptions_company') THEN
        ALTER TABLE student_subscriptions ADD CONSTRAINT fk_student_subscriptions_company 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_debt_records_company') THEN
        ALTER TABLE debt_records ADD CONSTRAINT fk_debt_records_company 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_lesson_students_company') THEN
        ALTER TABLE lesson_students ADD CONSTRAINT fk_lesson_students_company 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Set company_id as NOT NULL after updating existing records
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='groups' AND column_name='company_id' AND is_nullable='YES') THEN
        ALTER TABLE groups ALTER COLUMN company_id SET NOT NULL;
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='group_schedule') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='group_schedule' AND column_name='company_id' AND is_nullable='YES') THEN
            ALTER TABLE group_schedule ALTER COLUMN company_id SET NOT NULL;
        END IF;
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='student_subscriptions' AND column_name='company_id' AND is_nullable='YES') THEN
        ALTER TABLE student_subscriptions ALTER COLUMN company_id SET NOT NULL;
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='payment_transactions' AND column_name='company_id' AND is_nullable='YES') THEN
        ALTER TABLE payment_transactions ALTER COLUMN company_id SET NOT NULL;
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='debt_records' AND column_name='company_id' AND is_nullable='YES') THEN
        ALTER TABLE debt_records ALTER COLUMN company_id SET NOT NULL;
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='lesson_students' AND column_name='company_id' AND is_nullable='YES') THEN
        ALTER TABLE lesson_students ALTER COLUMN company_id SET NOT NULL;
    END IF;
END $$;
