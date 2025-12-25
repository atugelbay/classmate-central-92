-- ============================================
-- Migration 027 Rollback: Remove Branch Support
-- ============================================

-- Drop trigger and function
DROP TRIGGER IF EXISTS trigger_branches_updated_at ON branches;
DROP FUNCTION IF EXISTS update_branches_updated_at();

-- Drop indexes from tables with branch_id
DROP INDEX IF EXISTS idx_transaction_branch;
DROP INDEX IF EXISTS idx_invoice_item_branch;
DROP INDEX IF EXISTS idx_invoice_branch;
DROP INDEX IF EXISTS idx_subscription_consumption_branch;
DROP INDEX IF EXISTS idx_lesson_occurrence_branch;
DROP INDEX IF EXISTS idx_schedule_rule_branch;
DROP INDEX IF EXISTS idx_tariffs_branch;
DROP INDEX IF EXISTS idx_leads_branch;
DROP INDEX IF EXISTS idx_individual_enrollment_branch;
DROP INDEX IF EXISTS idx_enrollment_branch;
DROP INDEX IF EXISTS idx_settings_branch;
DROP INDEX IF EXISTS idx_student_discounts_branch;
DROP INDEX IF EXISTS idx_discounts_branch;
DROP INDEX IF EXISTS idx_lesson_attendance_branch;
DROP INDEX IF EXISTS idx_student_subscriptions_branch;
DROP INDEX IF EXISTS idx_subscription_types_branch;
DROP INDEX IF EXISTS idx_debt_records_branch;
DROP INDEX IF EXISTS idx_payment_transactions_branch;
DROP INDEX IF EXISTS idx_rooms_branch;
DROP INDEX IF EXISTS idx_lessons_branch;
DROP INDEX IF EXISTS idx_groups_branch;
DROP INDEX IF EXISTS idx_students_branch;
DROP INDEX IF EXISTS idx_teachers_branch;

-- Remove branch_id columns from existing tables
ALTER TABLE transaction DROP COLUMN IF EXISTS branch_id;
ALTER TABLE invoice_item DROP COLUMN IF EXISTS branch_id;
ALTER TABLE invoice DROP COLUMN IF EXISTS branch_id;
ALTER TABLE subscription_consumption DROP COLUMN IF EXISTS branch_id;
ALTER TABLE lesson_occurrence DROP COLUMN IF EXISTS branch_id;
ALTER TABLE schedule_rule DROP COLUMN IF EXISTS branch_id;
ALTER TABLE tariffs DROP COLUMN IF EXISTS branch_id;
ALTER TABLE leads DROP COLUMN IF EXISTS branch_id;
ALTER TABLE individual_enrollment DROP COLUMN IF EXISTS branch_id;
ALTER TABLE enrollment DROP COLUMN IF EXISTS branch_id;
ALTER TABLE settings DROP COLUMN IF EXISTS branch_id;
ALTER TABLE student_discounts DROP COLUMN IF EXISTS branch_id;
ALTER TABLE discounts DROP COLUMN IF EXISTS branch_id;
ALTER TABLE lesson_attendance DROP COLUMN IF EXISTS branch_id;
ALTER TABLE student_subscriptions DROP COLUMN IF EXISTS branch_id;
ALTER TABLE subscription_types DROP COLUMN IF EXISTS branch_id;
ALTER TABLE debt_records DROP COLUMN IF EXISTS branch_id;
ALTER TABLE payment_transactions DROP COLUMN IF EXISTS branch_id;
ALTER TABLE rooms DROP COLUMN IF EXISTS branch_id;
ALTER TABLE lessons DROP COLUMN IF EXISTS branch_id;
ALTER TABLE groups DROP COLUMN IF EXISTS branch_id;
ALTER TABLE students DROP COLUMN IF EXISTS branch_id;
ALTER TABLE teachers DROP COLUMN IF EXISTS branch_id;

-- Drop indexes for user_branches
DROP INDEX IF EXISTS idx_user_branches_company;
DROP INDEX IF EXISTS idx_user_branches_branch;
DROP INDEX IF EXISTS idx_user_branches_user;

-- Drop indexes for branches
DROP INDEX IF EXISTS idx_branches_status;
DROP INDEX IF EXISTS idx_branches_company;

-- Drop tables
DROP TABLE IF EXISTS user_branches;
DROP TABLE IF EXISTS branches;

