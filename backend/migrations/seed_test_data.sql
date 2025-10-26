-- Test data in English (UTF-8 encoding issue workaround)
SET CLIENT_ENCODING TO 'UTF8';

-- Clear all tables
TRUNCATE TABLE lesson_students, lesson_attendance, student_groups, student_subjects, lessons, groups, students, teachers, lead_tasks, lead_activities, leads, rooms, debt_records, payment_transactions, student_balance, tariffs, subscription_freezes, student_subscriptions, subscription_types CASCADE;

-- Teachers
INSERT INTO teachers (id, name, subject, email, phone, status, workload) VALUES
('teacher-1', 'Aliya Nurgalieva', 'Mathematics', 'aliya@example.com', '+7 701 234 5678', 'active', 15),
('teacher-2', 'Erzhan Kairatuly', 'Physics', 'erzhan@example.com', '+7 702 345 6789', 'active', 12),
('teacher-3', 'Dinara Seitova', 'English', 'dinara@example.com', '+7 705 456 7890', 'active', 18),
('teacher-4', 'Aset Bekbolatov', 'Computer Science', 'aset@example.com', '+7 708 567 8901', 'active', 10),
('teacher-5', 'Gulnar Amirzhanova', 'Chemistry', 'gulnar@example.com', '+7 777 678 9012', 'active', 8);

-- Students
INSERT INTO students (id, name, age, email, phone, status) VALUES
('student-1', 'Aidar Serikbayev', 16, 'aidar@example.com', '+7 701 111 2222', 'active'),
('student-2', 'Aigerim Kassymova', 15, 'aigerim@example.com', '+7 702 222 3333', 'active'),
('student-3', 'Nursultan Abdirov', 17, 'nursultan@example.com', '+7 705 333 4444', 'active'),
('student-4', 'Zhanna Orazbayeva', 16, 'zhanna@example.com', '+7 708 444 5555', 'active'),
('student-5', 'Arman Tursynov', 15, 'arman@example.com', '+7 777 555 6666', 'active'),
('student-6', 'Kamila Nurlankzy', 16, 'kamila@example.com', '+7 701 666 7777', 'inactive'),
('student-7', 'Iliyas Bauyrzhan', 17, 'iliyas@example.com', '+7 702 777 8888', 'frozen'),
('student-8', 'Saule Kairatkzy', 15, 'saule@example.com', '+7 705 888 9999', 'active');

-- Student subjects
INSERT INTO student_subjects (student_id, subject) VALUES
('student-1', 'Mathematics'), ('student-1', 'Physics'),
('student-2', 'English'), ('student-2', 'Mathematics'),
('student-3', 'Computer Science'), ('student-3', 'Mathematics'),
('student-4', 'Chemistry'), ('student-4', 'English'),
('student-5', 'Mathematics'), ('student-5', 'Physics'),
('student-6', 'English'), ('student-7', 'Computer Science'),
('student-8', 'Mathematics');

-- Groups
INSERT INTO groups (id, name, subject, teacher_id, schedule) VALUES
('group-1', 'Mathematics 10A', 'Mathematics', 'teacher-1', 'Mon, Wed, Fri 10:00-11:30'),
('group-2', 'Physics 11B', 'Physics', 'teacher-2', 'Tue, Thu 14:00-15:30'),
('group-3', 'English Intermediate', 'English', 'teacher-3', 'Mon, Wed 16:00-17:30'),
('group-4', 'Python Programming', 'Computer Science', 'teacher-4', 'Sat 10:00-13:00'),
('group-5', 'Chemistry Grade 10', 'Chemistry', 'teacher-5', 'Tue, Thu 10:00-11:30');

-- Student groups
INSERT INTO student_groups (student_id, group_id) VALUES
('student-1', 'group-1'), ('student-2', 'group-1'), ('student-2', 'group-3'),
('student-3', 'group-4'), ('student-4', 'group-5'), ('student-4', 'group-3'),
('student-5', 'group-1'), ('student-6', 'group-3'), ('student-7', 'group-4'), ('student-8', 'group-1');

-- Rooms
INSERT INTO rooms (id, name, capacity, color, status) VALUES
('room-1', 'Room 101', 20, '#3B82F6', 'active'),
('room-2', 'Room 102', 15, '#10B981', 'active'),
('room-3', 'Room 201', 25, '#F59E0B', 'active'),
('room-4', 'Computer Lab', 12, '#8B5CF6', 'active'),
('room-5', 'Chemistry Lab', 18, '#EF4444', 'active');

-- Lessons
INSERT INTO lessons (id, title, teacher_id, group_id, subject, start_time, end_time, room, room_id, status) VALUES
('lesson-1', 'Math: Algebra', 'teacher-1', 'group-1', 'Mathematics', 
  CURRENT_DATE + INTERVAL '1 day' + TIME '10:00', CURRENT_DATE + INTERVAL '1 day' + TIME '11:30', 'Room 101', 'room-1', 'scheduled'),
('lesson-2', 'English: Grammar', 'teacher-3', 'group-3', 'English', 
  CURRENT_DATE + INTERVAL '1 day' + TIME '16:00', CURRENT_DATE + INTERVAL '1 day' + TIME '17:30', 'Room 102', 'room-2', 'scheduled'),
('lesson-3', 'Physics: Mechanics', 'teacher-2', 'group-2', 'Physics', 
  CURRENT_DATE + INTERVAL '2 day' + TIME '14:00', CURRENT_DATE + INTERVAL '2 day' + TIME '15:30', 'Room 201', 'room-3', 'scheduled'),
('lesson-4', 'Chemistry: Organic', 'teacher-5', 'group-5', 'Chemistry', 
  CURRENT_DATE + INTERVAL '2 day' + TIME '10:00', CURRENT_DATE + INTERVAL '2 day' + TIME '11:30', 'Chemistry Lab', 'room-5', 'scheduled'),
('lesson-5', 'Math: Geometry', 'teacher-1', 'group-1', 'Mathematics', 
  CURRENT_DATE + INTERVAL '3 day' + TIME '10:00', CURRENT_DATE + INTERVAL '3 day' + TIME '11:30', 'Room 101', 'room-1', 'scheduled'),
('lesson-6', 'Python: Basics', 'teacher-4', 'group-4', 'Computer Science', 
  CURRENT_DATE + INTERVAL '6 day' + TIME '10:00', CURRENT_DATE + INTERVAL '6 day' + TIME '13:00', 'Computer Lab', 'room-4', 'scheduled');

-- Lesson students
INSERT INTO lesson_students (lesson_id, student_id) VALUES
('lesson-1', 'student-1'), ('lesson-1', 'student-2'), ('lesson-1', 'student-5'), ('lesson-1', 'student-8'),
('lesson-2', 'student-2'), ('lesson-2', 'student-4'), ('lesson-2', 'student-6'),
('lesson-3', 'student-5'), ('lesson-4', 'student-4'),
('lesson-5', 'student-1'), ('lesson-5', 'student-2'), ('lesson-5', 'student-5'), ('lesson-5', 'student-8'),
('lesson-6', 'student-3'), ('lesson-6', 'student-7');

-- Leads
INSERT INTO leads (id, name, phone, email, source, status, notes, created_at, updated_at) VALUES
('lead-1', 'Ernar Zhumabekov', '+7 701 999 1111', 'ernar@example.com', 'call', 'new', 'Interested in math for exams', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
('lead-2', 'Asem Sagyndykova', '+7 702 888 2222', 'asem@example.com', 'website', 'in_progress', 'Wants English for child', NOW() - INTERVAL '1 day', NOW() - INTERVAL '3 hours'),
('lead-3', 'Murat Oteyuliyev', '+7 705 777 3333', 'murat@example.com', 'social', 'in_progress', 'From Instagram. Interested in programming', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'),
('lead-4', 'Ainur Toleuova', '+7 708 666 4444', 'ainur@example.com', 'referral', 'enrolled', 'Enrolled in chemistry group', NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 hour'),
('lead-5', 'Daulet Kassymov', '+7 777 555 5555', 'daulet@example.com', 'call', 'new', 'Needs physics', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes'),
('lead-6', 'Sandugash Nurlanova', '+7 701 444 6666', '', 'website', 'rejected', 'Price too high', NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days'),
('lead-7', 'Bakhyt Alibekov', '+7 702 333 7777', 'bakhyt@example.com', 'social', 'new', 'From Facebook. Wants private lessons', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours'),
('lead-8', 'Karlygash Mukhambetova', '+7 705 222 8888', 'karlygash@example.com', 'referral', 'in_progress', 'Referral from current student', NOW() - INTERVAL '2 days', NOW() - INTERVAL '5 hours');

-- Lead activities
INSERT INTO lead_activities (lead_id, activity_type, description, created_at) VALUES
('lead-2', 'call', 'Initial call. Discussed program and price', NOW() - INTERVAL '1 day'),
('lead-2', 'note', 'Sent schedule via email', NOW() - INTERVAL '3 hours'),
('lead-3', 'call', 'Called. Explained Python course', NOW() - INTERVAL '2 days'),
('lead-3', 'meeting', 'Meeting at office. Showed materials', NOW() - INTERVAL '1 day'),
('lead-4', 'call', 'Called. Booked trial lesson', NOW() - INTERVAL '5 days'),
('lead-8', 'call', 'Discussed program and prices', NOW() - INTERVAL '1 day');

-- Lead tasks
INSERT INTO lead_tasks (lead_id, title, description, due_date, status) VALUES
('lead-2', 'Call back for confirmation', 'Confirm convenient time for trial', NOW() + INTERVAL '1 day', 'pending'),
('lead-3', 'Send contract', 'Email contract for review', NOW() + INTERVAL '2 days', 'pending'),
('lead-5', 'Initial call', 'Call back about physics courses', NOW() + INTERVAL '3 hours', 'pending'),
('lead-7', 'Prepare individual plan', 'Create custom lesson program', NOW() + INTERVAL '1 day', 'pending'),
('lead-8', 'Reminder about start', 'Remind 1 week before classes', NOW() + INTERVAL '20 days', 'pending');

-- Tariffs
INSERT INTO tariffs (id, name, description, price, duration_days, lesson_count) VALUES
('tariff-1', '8 Lessons Package', 'Standard package of 8 lessons', 40000.00, 30, 8),
('tariff-2', '12 Lessons Package', 'Best value - 12 lessons', 55000.00, 45, 12),
('tariff-3', '16 Lessons Package', 'Maximum package - 16 lessons', 70000.00, 60, 16),
('tariff-4', 'Individual Lesson', 'One-time individual lesson', 8000.00, NULL, 1),
('tariff-5', 'Trial Lesson', 'First trial lesson with discount', 2000.00, 7, 1);

-- Subscription Types
INSERT INTO subscription_types (id, name, lessons_count, validity_days, price, can_freeze, description) VALUES
('sub-type-1', '8 Lessons Subscription', 8, 30, 40000.00, true, 'Standard subscription with 8 lessons valid for 30 days'),
('sub-type-2', '12 Lessons Subscription', 12, 45, 55000.00, true, 'Best value subscription with 12 lessons'),
('sub-type-3', '16 Lessons Subscription', 16, 60, 70000.00, true, 'Maximum subscription with 16 lessons'),
('sub-type-4', 'Unlimited Monthly', 20, 30, 80000.00, false, 'Unlimited lessons for a month');

-- Student Subscriptions (Active and expired examples)
INSERT INTO student_subscriptions (id, student_id, subscription_type_id, lessons_remaining, start_date, end_date, status, freeze_days_remaining) VALUES
('subscription-1', 'student-1', 'sub-type-1', 5, NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days', 'active', 5),
('subscription-2', 'student-2', 'sub-type-2', 10, NOW() - INTERVAL '5 days', NOW() + INTERVAL '40 days', 'active', 7),
('subscription-3', 'student-3', 'sub-type-1', 8, NOW() - INTERVAL '2 days', NOW() + INTERVAL '28 days', 'active', 5),
('subscription-4', 'student-4', 'sub-type-3', 14, NOW() - INTERVAL '15 days', NOW() + INTERVAL '45 days', 'active', 10),
('subscription-5', 'student-5', 'sub-type-2', 2, NOW() - INTERVAL '40 days', NOW() + INTERVAL '5 days', 'active', 0),
('subscription-6', 'student-6', 'sub-type-1', 0, NOW() - INTERVAL '60 days', NOW() - INTERVAL '30 days', 'expired', 0),
('subscription-7', 'student-7', 'sub-type-2', 6, NOW() - INTERVAL '20 days', NOW() + INTERVAL '25 days', 'frozen', 15),
('subscription-8', 'student-8', 'sub-type-1', 7, NOW() - INTERVAL '8 days', NOW() + INTERVAL '22 days', 'active', 5);

-- Payment Transactions (various types)
INSERT INTO payment_transactions (student_id, amount, type, payment_method, description, created_at) VALUES
-- Student 1
('student-1', 40000.00, 'payment', 'card', 'Payment for 8 lessons subscription', NOW() - INTERVAL '10 days'),
('student-1', 8000.00, 'payment', 'cash', 'Additional payment for extra lesson', NOW() - INTERVAL '3 days'),
-- Student 2
('student-2', 55000.00, 'payment', 'transfer', 'Payment for 12 lessons subscription', NOW() - INTERVAL '5 days'),
-- Student 3
('student-3', 40000.00, 'payment', 'card', 'Payment for 8 lessons subscription', NOW() - INTERVAL '2 days'),
-- Student 4
('student-4', 70000.00, 'payment', 'card', 'Payment for 16 lessons subscription', NOW() - INTERVAL '15 days'),
('student-4', 5000.00, 'payment', 'cash', 'Partial payment for materials', NOW() - INTERVAL '7 days'),
-- Student 5
('student-5', 55000.00, 'payment', 'transfer', 'Payment for 12 lessons subscription', NOW() - INTERVAL '40 days'),
('student-5', 10000.00, 'debt', 'other', 'Debt for upcoming subscription', NOW() - INTERVAL '2 days'),
-- Student 6
('student-6', 40000.00, 'payment', 'cash', 'Payment for expired subscription', NOW() - INTERVAL '60 days'),
('student-6', 2000.00, 'refund', 'card', 'Refund for cancelled lesson', NOW() - INTERVAL '35 days'),
-- Student 7
('student-7', 55000.00, 'payment', 'card', 'Payment for 12 lessons subscription', NOW() - INTERVAL '20 days'),
-- Student 8
('student-8', 40000.00, 'payment', 'transfer', 'Payment for 8 lessons subscription', NOW() - INTERVAL '8 days');

-- Student Balance
INSERT INTO student_balance (student_id, balance, last_payment_date) VALUES
('student-1', 8000.00, NOW() - INTERVAL '3 days'),
('student-2', 5000.00, NOW() - INTERVAL '5 days'),
('student-3', 0.00, NOW() - INTERVAL '2 days'),
('student-4', 3000.00, NOW() - INTERVAL '7 days'),
('student-5', -10000.00, NOW() - INTERVAL '2 days'),
('student-6', -2000.00, NOW() - INTERVAL '35 days'),
('student-7', 10000.00, NOW() - INTERVAL '20 days'),
('student-8', 2000.00, NOW() - INTERVAL '8 days');

-- Debt Records
INSERT INTO debt_records (student_id, amount, due_date, status, notes) VALUES
('student-5', 10000.00, NOW() + INTERVAL '5 days', 'pending', 'Payment for next subscription due soon'),
('student-6', 2000.00, NOW() - INTERVAL '10 days', 'pending', 'Overdue payment for cancelled lessons'),
('student-4', 5000.00, NOW() + INTERVAL '15 days', 'pending', 'Payment for additional materials');

-- Lesson Attendance (with various statuses)
INSERT INTO lesson_attendance (lesson_id, student_id, subscription_id, status, reason, notes, marked_by) VALUES
-- Past lessons with attendance
('lesson-1', 'student-1', 'subscription-1', 'attended', NULL, 'Active participation', NULL),
('lesson-1', 'student-2', 'subscription-2', 'attended', NULL, 'Completed all tasks', NULL),
('lesson-1', 'student-5', 'subscription-5', 'missed', 'Illness', 'Called to inform', NULL),
('lesson-1', 'student-8', 'subscription-8', 'attended', NULL, 'Good progress', NULL),
('lesson-2', 'student-2', 'subscription-2', 'attended', NULL, NULL, NULL),
('lesson-2', 'student-4', 'subscription-4', 'missed', 'Family emergency', NULL, NULL),
('lesson-2', 'student-6', NULL, 'cancelled', NULL, 'Lesson cancelled by teacher', NULL),
('lesson-5', 'student-1', 'subscription-1', 'attended', NULL, 'Excellent work', NULL),
('lesson-5', 'student-2', 'subscription-2', 'attended', NULL, NULL, NULL),
('lesson-5', 'student-5', 'subscription-5', 'attended', NULL, 'Caught up on previous material', NULL),
('lesson-5', 'student-8', 'subscription-8', 'attended', NULL, NULL, NULL);

-- Student Activity Log (history of actions)
INSERT INTO student_activity_log (student_id, activity_type, description, metadata, created_at) VALUES
-- Student 1 activities
('student-1', 'payment', 'Payment: 40000.00 KZT', '{"transaction_id": 1, "amount": 40000, "type": "payment"}', NOW() - INTERVAL '10 days'),
('student-1', 'subscription_change', 'Created new subscription. Lessons: 8', '{"subscription_id": "subscription-1", "lessons_count": 8}', NOW() - INTERVAL '10 days'),
('student-1', 'attendance', 'Attended lesson', '{"lesson_id": "lesson-1", "status": "attended"}', NOW() - INTERVAL '8 days'),
('student-1', 'subscription_change', 'Lesson deducted. Remaining: 7', '{"subscription_id": "subscription-1", "lessons_remaining": 7}', NOW() - INTERVAL '8 days'),
('student-1', 'attendance', 'Attended lesson', '{"lesson_id": "lesson-5", "status": "attended"}', NOW() - INTERVAL '5 days'),
('student-1', 'subscription_change', 'Lesson deducted. Remaining: 6', '{"subscription_id": "subscription-1", "lessons_remaining": 6}', NOW() - INTERVAL '5 days'),
('student-1', 'payment', 'Payment: 8000.00 KZT', '{"transaction_id": 2, "amount": 8000, "type": "payment"}', NOW() - INTERVAL '3 days'),
('student-1', 'note', 'Note added', '{"note": "Student shows excellent progress"}', NOW() - INTERVAL '2 days'),
-- Student 2 activities
('student-2', 'payment', 'Payment: 55000.00 KZT', '{"transaction_id": 3, "amount": 55000, "type": "payment"}', NOW() - INTERVAL '5 days'),
('student-2', 'subscription_change', 'Created new subscription. Lessons: 12', '{"subscription_id": "subscription-2", "lessons_count": 12}', NOW() - INTERVAL '5 days'),
('student-2', 'attendance', 'Attended lesson', '{"lesson_id": "lesson-1", "status": "attended"}', NOW() - INTERVAL '4 days'),
('student-2', 'subscription_change', 'Lesson deducted. Remaining: 11', '{"subscription_id": "subscription-2", "lessons_remaining": 11}', NOW() - INTERVAL '4 days'),
('student-2', 'attendance', 'Attended lesson', '{"lesson_id": "lesson-2", "status": "attended"}', NOW() - INTERVAL '3 days'),
('student-2', 'subscription_change', 'Lesson deducted. Remaining: 10', '{"subscription_id": "subscription-2", "lessons_remaining": 10}', NOW() - INTERVAL '3 days'),
-- Student 5 activities
('student-5', 'payment', 'Payment: 55000.00 KZT', '{"transaction_id": 7, "amount": 55000, "type": "payment"}', NOW() - INTERVAL '40 days'),
('student-5', 'subscription_change', 'Created new subscription. Lessons: 12', '{"subscription_id": "subscription-5", "lessons_count": 12}', NOW() - INTERVAL '40 days'),
('student-5', 'attendance', 'Missed lesson', '{"lesson_id": "lesson-1", "status": "missed", "reason": "Illness"}', NOW() - INTERVAL '8 days'),
('student-5', 'attendance', 'Attended lesson', '{"lesson_id": "lesson-5", "status": "attended"}', NOW() - INTERVAL '5 days'),
('student-5', 'subscription_change', 'Lesson deducted. Remaining: 2', '{"subscription_id": "subscription-5", "lessons_remaining": 2}', NOW() - INTERVAL '5 days'),
('student-5', 'debt_created', 'Debt created: 10000.00 KZT', '{"debt_id": 1, "amount": 10000}', NOW() - INTERVAL '2 days');

-- Student Notes
INSERT INTO student_notes (student_id, note, created_at) VALUES
('student-1', 'Student shows excellent progress in mathematics. Very attentive and completes all homework.', NOW() - INTERVAL '2 days'),
('student-1', 'Parents requested additional materials for advanced topics.', NOW() - INTERVAL '1 day'),
('student-2', 'Good participation in English classes. Needs more practice with speaking.', NOW() - INTERVAL '3 days'),
('student-3', 'Very talented in programming. Shows interest in advanced Python topics.', NOW() - INTERVAL '5 days'),
('student-4', 'Missed lesson due to family emergency. Need to catch up on Organic Chemistry topic.', NOW() - INTERVAL '2 days'),
('student-5', 'Was sick last week. Caught up quickly on missed material.', NOW() - INTERVAL '4 days'),
('student-5', 'Subscription running low. Discussed renewal with parents.', NOW() - INTERVAL '1 day'),
('student-7', 'Subscription frozen due to family vacation. Will resume next month.', NOW() - INTERVAL '10 days');

-- Notifications
INSERT INTO notifications (student_id, type, message, is_read, created_at) VALUES
('student-5', 'subscription_expiring', 'Your subscription is expiring in 5 days. Only 2 lessons remaining.', false, NOW() - INTERVAL '1 day'),
('student-5', 'debt_reminder', 'Payment reminder: 10000.00 KZT due in 5 days', false, NOW() - INTERVAL '1 day'),
('student-6', 'debt_reminder', 'Overdue payment: 2000.00 KZT (overdue by 10 days)', false, NOW() - INTERVAL '2 days'),
('student-6', 'subscription_expired', 'Your subscription has expired. Please renew to continue lessons.', false, NOW() - INTERVAL '30 days'),
('student-4', 'debt_reminder', 'Payment reminder: 5000.00 KZT due in 15 days', false, NOW() - INTERVAL '1 hour'),
('student-1', 'subscription_expiring', 'Only 5 lessons remaining in your subscription.', true, NOW() - INTERVAL '3 days'),
('student-8', 'subscription_expiring', 'Only 7 lessons remaining in your subscription.', false, NOW() - INTERVAL '12 hours');

-- Subscription Freezes
INSERT INTO subscription_freezes (subscription_id, freeze_start, freeze_end, reason) VALUES
('subscription-7', NOW() - INTERVAL '20 days', NULL, 'Family vacation abroad. Will return next month.');

