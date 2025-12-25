-- ============================================
-- Migration 027: Add Branch Support
-- ============================================
-- This migration adds support for multiple branches within a company
-- Each branch can have its own teachers, students, groups, etc.

-- Create branches table
CREATE TABLE IF NOT EXISTS branches (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    company_id VARCHAR(255) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    address TEXT,
    phone VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_branch_name_per_company UNIQUE (company_id, name)
);

-- Create user_branches table for many-to-many relationship
CREATE TABLE IF NOT EXISTS user_branches (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch_id VARCHAR(255) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    role_id VARCHAR(255) REFERENCES roles(id) ON DELETE SET NULL,
    company_id VARCHAR(255) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
    assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    PRIMARY KEY (user_id, branch_id, company_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_branches_company ON branches(company_id);
CREATE INDEX IF NOT EXISTS idx_branches_status ON branches(status);
CREATE INDEX IF NOT EXISTS idx_user_branches_user ON user_branches(user_id);
CREATE INDEX IF NOT EXISTS idx_user_branches_branch ON user_branches(branch_id);
CREATE INDEX IF NOT EXISTS idx_user_branches_company ON user_branches(company_id);

-- Add branch_id column to existing tables (only if tables exist)
-- Create helper function to safely add branch_id column
CREATE OR REPLACE FUNCTION add_branch_id_if_table_exists(tbl_name text)
RETURNS void AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND information_schema.tables.table_name = tbl_name
    ) THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS branch_id VARCHAR(255) REFERENCES branches(id) ON DELETE CASCADE', tbl_name);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Add branch_id to all tables
SELECT add_branch_id_if_table_exists('teachers');
SELECT add_branch_id_if_table_exists('students');
SELECT add_branch_id_if_table_exists('groups');
SELECT add_branch_id_if_table_exists('lessons');
SELECT add_branch_id_if_table_exists('rooms');
SELECT add_branch_id_if_table_exists('payment_transactions');
SELECT add_branch_id_if_table_exists('debt_records');
SELECT add_branch_id_if_table_exists('subscription_types');
SELECT add_branch_id_if_table_exists('student_subscriptions');
SELECT add_branch_id_if_table_exists('lesson_attendance');
SELECT add_branch_id_if_table_exists('discounts');
SELECT add_branch_id_if_table_exists('student_discounts');
SELECT add_branch_id_if_table_exists('settings');
SELECT add_branch_id_if_table_exists('enrollment');
SELECT add_branch_id_if_table_exists('individual_enrollment');
SELECT add_branch_id_if_table_exists('leads');
SELECT add_branch_id_if_table_exists('tariffs');
SELECT add_branch_id_if_table_exists('schedule_rule');
SELECT add_branch_id_if_table_exists('lesson_occurrence');
SELECT add_branch_id_if_table_exists('subscription_consumption');
SELECT add_branch_id_if_table_exists('invoice');
SELECT add_branch_id_if_table_exists('invoice_item');
SELECT add_branch_id_if_table_exists('transaction');

-- Drop helper function
DROP FUNCTION IF EXISTS add_branch_id_if_table_exists(text);

-- Create indexes for branch_id on all tables (only if tables exist)
CREATE OR REPLACE FUNCTION create_branch_index_if_table_exists(tbl_name text, idx_name text)
RETURNS void AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND information_schema.tables.table_name = tbl_name
    ) THEN
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(branch_id)', idx_name, tbl_name);
    END IF;
END;
$$ LANGUAGE plpgsql;

SELECT create_branch_index_if_table_exists('teachers', 'idx_teachers_branch');
SELECT create_branch_index_if_table_exists('students', 'idx_students_branch');
SELECT create_branch_index_if_table_exists('groups', 'idx_groups_branch');
SELECT create_branch_index_if_table_exists('lessons', 'idx_lessons_branch');
SELECT create_branch_index_if_table_exists('rooms', 'idx_rooms_branch');
SELECT create_branch_index_if_table_exists('payment_transactions', 'idx_payment_transactions_branch');
SELECT create_branch_index_if_table_exists('debt_records', 'idx_debt_records_branch');
SELECT create_branch_index_if_table_exists('subscription_types', 'idx_subscription_types_branch');
SELECT create_branch_index_if_table_exists('student_subscriptions', 'idx_student_subscriptions_branch');
SELECT create_branch_index_if_table_exists('lesson_attendance', 'idx_lesson_attendance_branch');
SELECT create_branch_index_if_table_exists('discounts', 'idx_discounts_branch');
SELECT create_branch_index_if_table_exists('student_discounts', 'idx_student_discounts_branch');
SELECT create_branch_index_if_table_exists('settings', 'idx_settings_branch');
SELECT create_branch_index_if_table_exists('enrollment', 'idx_enrollment_branch');
SELECT create_branch_index_if_table_exists('individual_enrollment', 'idx_individual_enrollment_branch');
SELECT create_branch_index_if_table_exists('leads', 'idx_leads_branch');
SELECT create_branch_index_if_table_exists('tariffs', 'idx_tariffs_branch');
SELECT create_branch_index_if_table_exists('schedule_rule', 'idx_schedule_rule_branch');
SELECT create_branch_index_if_table_exists('lesson_occurrence', 'idx_lesson_occurrence_branch');
SELECT create_branch_index_if_table_exists('subscription_consumption', 'idx_subscription_consumption_branch');
SELECT create_branch_index_if_table_exists('invoice', 'idx_invoice_branch');
SELECT create_branch_index_if_table_exists('invoice_item', 'idx_invoice_item_branch');
SELECT create_branch_index_if_table_exists('transaction', 'idx_transaction_branch');

DROP FUNCTION IF EXISTS create_branch_index_if_table_exists(text, text);

-- Create function to create default branch for existing companies and migrate data
CREATE OR REPLACE FUNCTION migrate_existing_data_to_branches()
RETURNS void AS $$
DECLARE
    company_record RECORD;
    default_branch_id VARCHAR(255);
    table_names TEXT[] := ARRAY['teachers', 'students', 'groups', 'lessons', 'rooms', 'payment_transactions', 
                                 'debt_records', 'subscription_types', 'student_subscriptions', 'lesson_attendance',
                                 'discounts', 'student_discounts', 'settings', 'enrollment', 'individual_enrollment',
                                 'leads', 'tariffs', 'schedule_rule', 'lesson_occurrence', 'subscription_consumption',
                                 'invoice', 'invoice_item', 'transaction'];
    tbl_name TEXT;
BEGIN
    -- For each existing company, create a default branch
    FOR company_record IN SELECT id, name FROM companies LOOP
        default_branch_id := company_record.id || '_default_branch';
        
        -- Create default branch
        INSERT INTO branches (id, name, company_id, status, created_at, updated_at)
        VALUES (default_branch_id, 'Основной филиал', company_record.id, 'active', NOW(), NOW())
        ON CONFLICT (company_id, name) DO NOTHING;
        
        -- Assign all users of this company to the default branch
        INSERT INTO user_branches (user_id, branch_id, company_id, assigned_at)
        SELECT id, default_branch_id, company_id, NOW()
        FROM users
        WHERE company_id = company_record.id
        ON CONFLICT (user_id, branch_id, company_id) DO NOTHING;
        
        -- Update existing data with branch_id (only if tables and columns exist)
        FOREACH tbl_name IN ARRAY table_names
        LOOP
            IF EXISTS (
                SELECT 1 FROM information_schema.columns c1
                WHERE c1.table_schema = 'public' 
                  AND c1.table_name = tbl_name
                  AND c1.column_name = 'branch_id'
            ) AND EXISTS (
                SELECT 1 FROM information_schema.columns c2
                WHERE c2.table_schema = 'public' 
                  AND c2.table_name = tbl_name 
                  AND c2.column_name = 'company_id'
            ) THEN
                EXECUTE format('UPDATE %I SET branch_id = %L WHERE company_id = %L AND branch_id IS NULL', 
                              tbl_name, default_branch_id, company_record.id);
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the migration function
SELECT migrate_existing_data_to_branches();

-- Drop the migration function as it's no longer needed
DROP FUNCTION IF EXISTS migrate_existing_data_to_branches();

-- Create trigger to automatically set updated_at on branches
CREATE OR REPLACE FUNCTION update_branches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_branches_updated_at
    BEFORE UPDATE ON branches
    FOR EACH ROW
    EXECUTE FUNCTION update_branches_updated_at();

