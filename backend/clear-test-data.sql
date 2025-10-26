-- Script to clear all data for a specific company (for testing)
-- Usage: Replace 'YOUR_COMPANY_ID' with actual company_id

-- Delete lessons and related data
DELETE FROM lesson_students WHERE company_id = $1;
DELETE FROM lesson_attendance WHERE lesson_id IN (SELECT id FROM lessons WHERE company_id = $1);
DELETE FROM lessons WHERE company_id = $1;

-- Delete subscriptions
DELETE FROM subscription_freeze WHERE subscription_id IN (SELECT id FROM student_subscriptions WHERE company_id = $1);
DELETE FROM student_subscriptions WHERE company_id = $1;
DELETE FROM subscription_types WHERE company_id = $1;

-- Delete finance data
DELETE FROM payment_transactions WHERE company_id = $1;
DELETE FROM debt_records WHERE company_id = $1;

-- Delete group data
DELETE FROM group_schedule WHERE company_id = $1;
DELETE FROM student_groups WHERE group_id IN (SELECT id FROM groups WHERE company_id = $1);
DELETE FROM groups WHERE company_id = $1;

-- Delete students and related data
DELETE FROM student_balance WHERE student_id IN (SELECT id FROM students WHERE company_id = $1);
DELETE FROM student_activity_log WHERE student_id IN (SELECT id FROM students WHERE company_id = $1);
DELETE FROM student_notes WHERE student_id IN (SELECT id FROM students WHERE company_id = $1);
DELETE FROM notifications WHERE student_id IN (SELECT id FROM students WHERE company_id = $1);
DELETE FROM students WHERE company_id = $1;

-- Delete teachers
DELETE FROM teachers WHERE company_id = $1;

-- Delete rooms
DELETE FROM rooms WHERE company_id = $1;

-- Note: We don't delete the company itself or users

