-- Quick script to clear and reload seed data
-- WARNING: This will DELETE ALL DATA in the database!
-- Use only in development/testing environments

BEGIN;

-- Disable triggers temporarily to avoid constraint issues during truncate
SET session_replication_role = replica;

-- Clear all data (CASCADE will handle dependencies)
TRUNCATE TABLE 
  -- New tables from migration 005
  notifications,
  student_notes,
  student_activity_log,
  
  -- Subscription and finance tables
  subscription_freezes,
  student_subscriptions,
  subscription_types,
  lesson_attendance,
  debt_records,
  payment_transactions,
  student_balance,
  tariffs,
  
  -- Lead tables
  lead_tasks,
  lead_activities,
  leads,
  
  -- Core tables
  lesson_students,
  lessons,
  student_groups,
  student_subjects,
  groups,
  students,
  teachers,
  rooms,
  
  -- Keep users table for login
  users
CASCADE;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

COMMIT;

-- Now you can run seed_data.sql or seed_test_data.sql
\echo 'All data cleared. Now run: \\i seed_data.sql or \\i seed_test_data.sql'

