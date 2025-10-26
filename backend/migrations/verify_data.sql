-- Verification queries to check seeded data

-- Check Students
SELECT 'Students' as table_name, COUNT(*) as count, 
       COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
       COUNT(CASE WHEN status = 'frozen' THEN 1 END) as frozen,
       COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive
FROM students;

-- Check Subscriptions
SELECT 'Subscriptions' as table_name, COUNT(*) as count,
       COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
       COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired,
       COUNT(CASE WHEN status = 'frozen' THEN 1 END) as frozen
FROM student_subscriptions;

-- Check Payment Transactions
SELECT 'Payment Transactions' as table_name, COUNT(*) as count,
       COALESCE(SUM(amount), 0) as total_amount
FROM payment_transactions;

-- Check Student Balance
SELECT 'Student Balance' as table_name, COUNT(*) as count,
       COALESCE(SUM(balance), 0) as total_balance,
       COUNT(CASE WHEN balance < 0 THEN 1 END) as negative_balance_count
FROM student_balance;

-- Check Debt Records
SELECT 'Debt Records' as table_name, COUNT(*) as count,
       COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
       COUNT(CASE WHEN due_date < NOW() THEN 1 END) as overdue
FROM debt_records;

-- Check Lesson Attendance
SELECT 'Lesson Attendance' as table_name, COUNT(*) as count,
       COUNT(CASE WHEN status = 'attended' THEN 1 END) as attended,
       COUNT(CASE WHEN status = 'missed' THEN 1 END) as missed,
       COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
FROM lesson_attendance;

-- Check Student Activity Log
SELECT 'Student Activity Log' as table_name, COUNT(*) as count,
       COUNT(DISTINCT student_id) as unique_students,
       COUNT(DISTINCT activity_type) as activity_types
FROM student_activity_log;

-- Check Student Notes
SELECT 'Student Notes' as table_name, COUNT(*) as count,
       COUNT(DISTINCT student_id) as students_with_notes
FROM student_notes;

-- Check Notifications
SELECT 'Notifications' as table_name, COUNT(*) as count,
       COUNT(CASE WHEN is_read = false THEN 1 END) as unread,
       COUNT(CASE WHEN is_read = true THEN 1 END) as read
FROM notifications;

-- Check Subscription Freezes
SELECT 'Subscription Freezes' as table_name, COUNT(*) as count
FROM subscription_freezes;

-- Detailed view of students with their data
SELECT 
    s.id,
    s.name,
    s.status,
    sb.balance,
    COUNT(DISTINCT ss.id) as subscriptions_count,
    COUNT(DISTINCT la.id) as attendance_count,
    COUNT(DISTINCT pt.id) as transaction_count,
    COUNT(DISTINCT sal.id) as activity_count
FROM students s
LEFT JOIN student_balance sb ON s.id = sb.student_id
LEFT JOIN student_subscriptions ss ON s.id = ss.student_id
LEFT JOIN lesson_attendance la ON s.id = la.student_id
LEFT JOIN payment_transactions pt ON s.id = pt.student_id
LEFT JOIN student_activity_log sal ON s.id = sal.student_id
GROUP BY s.id, s.name, s.status, sb.balance
ORDER BY s.id;

