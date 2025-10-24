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
INSERT INTO students (id, name, age, email, phone) VALUES
('student-1', 'Aidar Serikbayev', 16, 'aidar@example.com', '+7 701 111 2222'),
('student-2', 'Aigerim Kassymova', 15, 'aigerim@example.com', '+7 702 222 3333'),
('student-3', 'Nursultan Abdirov', 17, 'nursultan@example.com', '+7 705 333 4444'),
('student-4', 'Zhanna Orazbayeva', 16, 'zhanna@example.com', '+7 708 444 5555'),
('student-5', 'Arman Tursynov', 15, 'arman@example.com', '+7 777 555 6666'),
('student-6', 'Kamila Nurlankzy', 16, 'kamila@example.com', '+7 701 666 7777'),
('student-7', 'Iliyas Bauyrzhan', 17, 'iliyas@example.com', '+7 702 777 8888'),
('student-8', 'Saule Kairatkzy', 15, 'saule@example.com', '+7 705 888 9999');

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

