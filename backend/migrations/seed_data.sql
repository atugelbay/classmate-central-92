-- Mock data for testing
-- Этот файл можно запускать многократно благодаря ON CONFLICT

-- Teachers
INSERT INTO teachers (id, name, subject, email, phone, status, workload) VALUES
('teacher-1', 'Алия Нұрғалиева', 'Математика', 'aliya.nurgalieva@example.com', '+7 (701) 234-5678', 'active', 15),
('teacher-2', 'Ержан Қайратұлы', 'Физика', 'erzhan.kairatuly@example.com', '+7 (702) 345-6789', 'active', 12),
('teacher-3', 'Динара Сейтова', 'Английский язык', 'dinara.seitova@example.com', '+7 (705) 456-7890', 'active', 18),
('teacher-4', 'Асет Бекболатов', 'Информатика', 'aset.bekbolatov@example.com', '+7 (708) 567-8901', 'active', 10),
('teacher-5', 'Гүлнар Әміржанова', 'Химия', 'gulnar.amirzhanova@example.com', '+7 (777) 678-9012', 'active', 8)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  status = EXCLUDED.status,
  workload = EXCLUDED.workload;

-- Students
INSERT INTO students (id, name, age, email, phone, status) VALUES
('student-1', 'Айдар Серікбаев', 16, 'aidar.serikbayev@example.com', '+7 (701) 111-2222', 'active'),
('student-2', 'Айгерім Қасымова', 15, 'aigerim.kassymova@example.com', '+7 (702) 222-3333', 'active'),
('student-3', 'Нұрсұлтан Әбдіров', 17, 'nursultan.abdirov@example.com', '+7 (705) 333-4444', 'active'),
('student-4', 'Жанна Оразбаева', 16, 'zhanna.orazbayeva@example.com', '+7 (708) 444-5555', 'active'),
('student-5', 'Арман Тұрсынов', 15, 'arman.tursynov@example.com', '+7 (777) 555-6666', 'active'),
('student-6', 'Камила Нұрланқызы', 16, 'kamila.nurlankzy@example.com', '+7 (701) 666-7777', 'inactive'),
('student-7', 'Ілияс Бауыржанов', 17, 'iliyas.bauyrzhan@example.com', '+7 (702) 777-8888', 'frozen'),
('student-8', 'Сәуле Қайратқызы', 15, 'saule.kairatkzy@example.com', '+7 (705) 888-9999', 'active')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  age = EXCLUDED.age,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  status = EXCLUDED.status;

-- Student subjects
INSERT INTO student_subjects (student_id, subject) VALUES
('student-1', 'Математика'),
('student-1', 'Физика'),
('student-2', 'Английский язык'),
('student-2', 'Математика'),
('student-3', 'Информатика'),
('student-3', 'Математика'),
('student-4', 'Химия'),
('student-4', 'Английский язык'),
('student-5', 'Математика'),
('student-5', 'Физика'),
('student-6', 'Английский язык'),
('student-7', 'Информатика'),
('student-8', 'Математика')
ON CONFLICT (student_id, subject) DO NOTHING;

-- Groups
INSERT INTO groups (id, name, subject, teacher_id, schedule) VALUES
('group-1', 'Математика 10А', 'Математика', 'teacher-1', 'Пн, Ср, Пт 10:00-11:30'),
('group-2', 'Физика 11Б', 'Физика', 'teacher-2', 'Вт, Чт 14:00-15:30'),
('group-3', 'Английский Intermediate', 'Английский язык', 'teacher-3', 'Пн, Ср 16:00-17:30'),
('group-4', 'Программирование Python', 'Информатика', 'teacher-4', 'Сб 10:00-13:00'),
('group-5', 'Химия 10 класс', 'Химия', 'teacher-5', 'Вт, Чт 10:00-11:30')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  teacher_id = EXCLUDED.teacher_id,
  schedule = EXCLUDED.schedule;

-- Student groups
INSERT INTO student_groups (student_id, group_id) VALUES
('student-1', 'group-1'),
('student-2', 'group-1'),
('student-2', 'group-3'),
('student-3', 'group-4'),
('student-4', 'group-5'),
('student-4', 'group-3'),
('student-5', 'group-1'),
('student-6', 'group-3'),
('student-7', 'group-4'),
('student-8', 'group-1')
ON CONFLICT (student_id, group_id) DO NOTHING;

-- Rooms
INSERT INTO rooms (id, name, capacity, color, status) VALUES
('room-1', 'Аудитория 101', 20, '#3B82F6', 'active'),
('room-2', 'Аудитория 102', 15, '#10B981', 'active'),
('room-3', 'Аудитория 201', 25, '#F59E0B', 'active'),
('room-4', 'Компьютерный класс', 12, '#8B5CF6', 'active'),
('room-5', 'Лаборатория химии', 18, '#EF4444', 'active')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  capacity = EXCLUDED.capacity,
  color = EXCLUDED.color,
  status = EXCLUDED.status;

-- Lessons (на текущую и следующую неделю)
INSERT INTO lessons (id, title, teacher_id, group_id, subject, start_time, end_time, room, room_id, status) VALUES
-- Понедельник
('lesson-1', 'Математика: Алгебра', 'teacher-1', 'group-1', 'Математика', 
  CURRENT_DATE + INTERVAL '1 day' + TIME '10:00', CURRENT_DATE + INTERVAL '1 day' + TIME '11:30', 
  'Аудитория 101', 'room-1', 'scheduled'),
('lesson-2', 'Английский язык: Grammar', 'teacher-3', 'group-3', 'Английский язык', 
  CURRENT_DATE + INTERVAL '1 day' + TIME '16:00', CURRENT_DATE + INTERVAL '1 day' + TIME '17:30', 
  'Аудитория 102', 'room-2', 'scheduled'),

-- Вторник
('lesson-3', 'Физика: Механика', 'teacher-2', 'group-2', 'Физика', 
  CURRENT_DATE + INTERVAL '2 day' + TIME '14:00', CURRENT_DATE + INTERVAL '2 day' + TIME '15:30', 
  'Аудитория 201', 'room-3', 'scheduled'),
('lesson-4', 'Химия: Органика', 'teacher-5', 'group-5', 'Химия', 
  CURRENT_DATE + INTERVAL '2 day' + TIME '10:00', CURRENT_DATE + INTERVAL '2 day' + TIME '11:30', 
  'Лаборатория химии', 'room-5', 'scheduled'),

-- Среда
('lesson-5', 'Математика: Геометрия', 'teacher-1', 'group-1', 'Математика', 
  CURRENT_DATE + INTERVAL '3 day' + TIME '10:00', CURRENT_DATE + INTERVAL '3 day' + TIME '11:30', 
  'Аудитория 101', 'room-1', 'scheduled'),
('lesson-6', 'Английский язык: Speaking', 'teacher-3', 'group-3', 'Английский язык', 
  CURRENT_DATE + INTERVAL '3 day' + TIME '16:00', CURRENT_DATE + INTERVAL '3 day' + TIME '17:30', 
  'Аудитория 102', 'room-2', 'scheduled'),

-- Четверг
('lesson-7', 'Физика: Электричество', 'teacher-2', 'group-2', 'Физика', 
  CURRENT_DATE + INTERVAL '4 day' + TIME '14:00', CURRENT_DATE + INTERVAL '4 day' + TIME '15:30', 
  'Аудитория 201', 'room-3', 'scheduled'),
('lesson-8', 'Химия: Практика', 'teacher-5', 'group-5', 'Химия', 
  CURRENT_DATE + INTERVAL '4 day' + TIME '10:00', CURRENT_DATE + INTERVAL '4 day' + TIME '11:30', 
  'Лаборатория химии', 'room-5', 'scheduled'),

-- Пятница
('lesson-9', 'Математика: Тригонометрия', 'teacher-1', 'group-1', 'Математика', 
  CURRENT_DATE + INTERVAL '5 day' + TIME '10:00', CURRENT_DATE + INTERVAL '5 day' + TIME '11:30', 
  'Аудитория 101', 'room-1', 'scheduled'),

-- Суббота
('lesson-10', 'Python: Основы программирования', 'teacher-4', 'group-4', 'Информатика', 
  CURRENT_DATE + INTERVAL '6 day' + TIME '10:00', CURRENT_DATE + INTERVAL '6 day' + TIME '13:00', 
  'Компьютерный класс', 'room-4', 'scheduled')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  teacher_id = EXCLUDED.teacher_id,
  group_id = EXCLUDED.group_id,
  subject = EXCLUDED.subject,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  room = EXCLUDED.room,
  room_id = EXCLUDED.room_id,
  status = EXCLUDED.status;

-- Lesson students
INSERT INTO lesson_students (lesson_id, student_id) VALUES
('lesson-1', 'student-1'),
('lesson-1', 'student-2'),
('lesson-1', 'student-5'),
('lesson-1', 'student-8'),
('lesson-2', 'student-2'),
('lesson-2', 'student-4'),
('lesson-2', 'student-6'),
('lesson-3', 'student-5'),
('lesson-4', 'student-4'),
('lesson-5', 'student-1'),
('lesson-5', 'student-2'),
('lesson-5', 'student-5'),
('lesson-5', 'student-8'),
('lesson-6', 'student-2'),
('lesson-6', 'student-4'),
('lesson-6', 'student-6'),
('lesson-7', 'student-5'),
('lesson-8', 'student-4'),
('lesson-9', 'student-1'),
('lesson-9', 'student-2'),
('lesson-9', 'student-5'),
('lesson-9', 'student-8'),
('lesson-10', 'student-3'),
('lesson-10', 'student-7')
ON CONFLICT (lesson_id, student_id) DO NOTHING;

-- Leads
INSERT INTO leads (id, name, phone, email, source, status, notes, created_at, updated_at) VALUES
('lead-1', 'Ернар Жұмабеков', '+7 (701) 999-1111', 'ernar.zhumabekov@example.com', 'call', 'new', 
  'Интересуется курсами математики для подготовки к ЕНТ', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
('lead-2', 'Асем Сағындықова', '+7 (702) 888-2222', 'asem.sagyndykova@example.com', 'website', 'in_progress', 
  'Хочет записать ребенка на английский язык. Запланирован звонок на завтра', NOW() - INTERVAL '1 day', NOW() - INTERVAL '3 hours'),
('lead-3', 'Мұрат Өтеулиев', '+7 (705) 777-3333', 'murat.oteyuliev@example.com', 'social', 'in_progress', 
  'Пришел из Instagram. Интересуется программированием', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'),
('lead-4', 'Айнұр Төлеуова', '+7 (708) 666-4444', 'ainur.toleuyova@example.com', 'referral', 'enrolled', 
  'Порекомендовала подруга. Записалась в группу по химии', NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 hour'),
('lead-5', 'Дәулет Қасымов', '+7 (777) 555-5555', 'daulet.kassymov@example.com', 'call', 'new', 
  'Позвонил по объявлению. Нужна физика', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes'),
('lead-6', 'Сандуғаш Нұрланова', '+7 (701) 444-6666', '', 'website', 'rejected', 
  'Не устроила цена', NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days'),
('lead-7', 'Бахыт Әлібеков', '+7 (702) 333-7777', 'bakhyt.alibekov@example.com', 'social', 'new', 
  'Написал в Facebook. Интересуется индивидуальными занятиями', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours'),
('lead-8', 'Қарлығаш Мұхамбетова', '+7 (705) 222-8888', 'karlygash.mukhambetova@example.com', 'referral', 'in_progress', 
  'Рекомендация от текущего ученика. Планирует начать со следующего месяца', NOW() - INTERVAL '2 days', NOW() - INTERVAL '5 hours')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  source = EXCLUDED.source,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;

-- Lead activities
INSERT INTO lead_activities (lead_id, activity_type, description, created_at) VALUES
('lead-2', 'call', 'Первичный звонок. Обсудили программу и стоимость', NOW() - INTERVAL '1 day'),
('lead-2', 'note', 'Отправил расписание групп на email', NOW() - INTERVAL '3 hours'),
('lead-3', 'call', 'Звонок. Пояснил детали курса Python', NOW() - INTERVAL '2 days'),
('lead-3', 'meeting', 'Встреча в офисе. Показал учебные материалы', NOW() - INTERVAL '1 day'),
('lead-4', 'call', 'Первичный звонок. Записалась на пробное занятие', NOW() - INTERVAL '5 days'),
('lead-4', 'note', 'Прошла пробный урок. Решила записаться', NOW() - INTERVAL '2 days'),
('lead-8', 'call', 'Обсудили программу и цены', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- Lead tasks
INSERT INTO lead_tasks (lead_id, title, description, due_date, status) VALUES
('lead-2', 'Перезвонить для подтверждения', 'Уточнить удобное время для пробного урока', NOW() + INTERVAL '1 day', 'pending'),
('lead-3', 'Отправить договор', 'Выслать договор на email для ознакомления', NOW() + INTERVAL '2 days', 'pending'),
('lead-5', 'Первичный звонок', 'Перезвонить и рассказать о курсах физики', NOW() + INTERVAL '3 hours', 'pending'),
('lead-7', 'Составить индивидуальный план', 'Подготовить программу индивидуальных занятий', NOW() + INTERVAL '1 day', 'pending'),
('lead-8', 'Напомнить о старте', 'Напомнить за неделю до начала занятий', NOW() + INTERVAL '20 days', 'pending')
ON CONFLICT DO NOTHING;

-- Tariffs
INSERT INTO tariffs (id, name, description, price, duration_days, lesson_count) VALUES
('tariff-1', '8 занятий', 'Стандартный абонемент на 8 занятий', 40000.00, 30, 8),
('tariff-2', '12 занятий', 'Выгодный абонемент на 12 занятий', 55000.00, 45, 12),
('tariff-3', '16 занятий', 'Максимальный абонемент на 16 занятий', 70000.00, 60, 16),
('tariff-4', 'Индивидуальное', 'Индивидуальное занятие (разовое)', 8000.00, NULL, 1),
('tariff-5', 'Пробное занятие', 'Первое пробное занятие со скидкой', 2000.00, 7, 1)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  duration_days = EXCLUDED.duration_days,
  lesson_count = EXCLUDED.lesson_count;

-- Subscription Types (Типы абонементов)
INSERT INTO subscription_types (id, name, lessons_count, validity_days, price, can_freeze, description) VALUES
('sub-type-1', 'Абонемент на 8 занятий', 8, 30, 40000.00, true, 'Стандартный абонемент на 8 занятий, действует 30 дней'),
('sub-type-2', 'Абонемент на 12 занятий', 12, 45, 55000.00, true, 'Выгодный абонемент на 12 занятий'),
('sub-type-3', 'Абонемент на 16 занятий', 16, 60, 70000.00, true, 'Максимальный абонемент на 16 занятий'),
('sub-type-4', 'Безлимитный месячный', 20, 30, 80000.00, false, 'Неограниченное количество занятий в месяц')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  lessons_count = EXCLUDED.lessons_count,
  validity_days = EXCLUDED.validity_days,
  price = EXCLUDED.price,
  can_freeze = EXCLUDED.can_freeze,
  description = EXCLUDED.description;

-- Student Subscriptions (Абонементы учеников)
INSERT INTO student_subscriptions (id, student_id, subscription_type_id, lessons_remaining, start_date, end_date, status, freeze_days_remaining) VALUES
('subscription-1', 'student-1', 'sub-type-1', 5, NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days', 'active', 5),
('subscription-2', 'student-2', 'sub-type-2', 10, NOW() - INTERVAL '5 days', NOW() + INTERVAL '40 days', 'active', 7),
('subscription-3', 'student-3', 'sub-type-1', 8, NOW() - INTERVAL '2 days', NOW() + INTERVAL '28 days', 'active', 5),
('subscription-4', 'student-4', 'sub-type-3', 14, NOW() - INTERVAL '15 days', NOW() + INTERVAL '45 days', 'active', 10),
('subscription-5', 'student-5', 'sub-type-2', 2, NOW() - INTERVAL '40 days', NOW() + INTERVAL '5 days', 'active', 0),
('subscription-6', 'student-6', 'sub-type-1', 0, NOW() - INTERVAL '60 days', NOW() - INTERVAL '30 days', 'expired', 0),
('subscription-7', 'student-7', 'sub-type-2', 6, NOW() - INTERVAL '20 days', NOW() + INTERVAL '25 days', 'frozen', 15),
('subscription-8', 'student-8', 'sub-type-1', 7, NOW() - INTERVAL '8 days', NOW() + INTERVAL '22 days', 'active', 5)
ON CONFLICT (id) DO UPDATE SET
  lessons_remaining = EXCLUDED.lessons_remaining,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  status = EXCLUDED.status,
  freeze_days_remaining = EXCLUDED.freeze_days_remaining;

-- Payment Transactions (Транзакции)
INSERT INTO payment_transactions (student_id, amount, type, payment_method, description, created_at) VALUES
-- Студент 1
('student-1', 40000.00, 'payment', 'card', 'Оплата абонемента на 8 занятий', NOW() - INTERVAL '10 days'),
('student-1', 8000.00, 'payment', 'cash', 'Дополнительная оплата за материалы', NOW() - INTERVAL '3 days'),
-- Студент 2
('student-2', 55000.00, 'payment', 'transfer', 'Оплата абонемента на 12 занятий', NOW() - INTERVAL '5 days'),
-- Студент 3
('student-3', 40000.00, 'payment', 'card', 'Оплата абонемента на 8 занятий', NOW() - INTERVAL '2 days'),
-- Студент 4
('student-4', 70000.00, 'payment', 'card', 'Оплата абонемента на 16 занятий', NOW() - INTERVAL '15 days'),
('student-4', 5000.00, 'payment', 'cash', 'Частичная оплата за учебные материалы', NOW() - INTERVAL '7 days'),
-- Студент 5
('student-5', 55000.00, 'payment', 'transfer', 'Оплата абонемента на 12 занятий', NOW() - INTERVAL '40 days'),
('student-5', 10000.00, 'debt', 'other', 'Задолженность за следующий абонемент', NOW() - INTERVAL '2 days'),
-- Студент 6
('student-6', 40000.00, 'payment', 'cash', 'Оплата истекшего абонемента', NOW() - INTERVAL '60 days'),
('student-6', 2000.00, 'refund', 'card', 'Возврат за отмененное занятие', NOW() - INTERVAL '35 days'),
-- Студент 7
('student-7', 55000.00, 'payment', 'card', 'Оплата абонемента на 12 занятий', NOW() - INTERVAL '20 days'),
-- Студент 8
('student-8', 40000.00, 'payment', 'transfer', 'Оплата абонемента на 8 занятий', NOW() - INTERVAL '8 days')
ON CONFLICT DO NOTHING;

-- Student Balance (Баланс учеников)
INSERT INTO student_balance (student_id, balance, last_payment_date) VALUES
('student-1', 8000.00, NOW() - INTERVAL '3 days'),
('student-2', 5000.00, NOW() - INTERVAL '5 days'),
('student-3', 0.00, NOW() - INTERVAL '2 days'),
('student-4', 3000.00, NOW() - INTERVAL '7 days'),
('student-5', -10000.00, NOW() - INTERVAL '2 days'),
('student-6', -2000.00, NOW() - INTERVAL '35 days'),
('student-7', 10000.00, NOW() - INTERVAL '20 days'),
('student-8', 2000.00, NOW() - INTERVAL '8 days')
ON CONFLICT (student_id) DO UPDATE SET
  balance = EXCLUDED.balance,
  last_payment_date = EXCLUDED.last_payment_date;

-- Debt Records (Долги)
INSERT INTO debt_records (student_id, amount, due_date, status, notes) VALUES
('student-5', 10000.00, NOW() + INTERVAL '5 days', 'pending', 'Оплата за следующий абонемент скоро'),
('student-6', 2000.00, NOW() - INTERVAL '10 days', 'pending', 'Просроченная оплата за отмененные занятия'),
('student-4', 5000.00, NOW() + INTERVAL '15 days', 'pending', 'Оплата за дополнительные материалы')
ON CONFLICT DO NOTHING;

-- Lesson Attendance (Посещаемость)
INSERT INTO lesson_attendance (lesson_id, student_id, subscription_id, status, reason, notes, marked_by) VALUES
-- Прошедшие занятия с отметками
('lesson-1', 'student-1', 'subscription-1', 'attended', NULL, 'Активное участие', NULL),
('lesson-1', 'student-2', 'subscription-2', 'attended', NULL, 'Выполнил все задания', NULL),
('lesson-1', 'student-5', 'subscription-5', 'missed', 'Болезнь', 'Позвонил и предупредил', NULL),
('lesson-1', 'student-8', 'subscription-8', 'attended', NULL, 'Хороший прогресс', NULL),
('lesson-2', 'student-2', 'subscription-2', 'attended', NULL, NULL, NULL),
('lesson-2', 'student-4', 'subscription-4', 'missed', 'Семейные обстоятельства', NULL, NULL),
('lesson-2', 'student-6', NULL, 'cancelled', NULL, 'Занятие отменено преподавателем', NULL),
('lesson-5', 'student-1', 'subscription-1', 'attended', NULL, 'Отличная работа', NULL),
('lesson-5', 'student-2', 'subscription-2', 'attended', NULL, NULL, NULL),
('lesson-5', 'student-5', 'subscription-5', 'attended', NULL, 'Догнал пропущенный материал', NULL),
('lesson-5', 'student-8', 'subscription-8', 'attended', NULL, NULL, NULL)
ON CONFLICT (lesson_id, student_id) DO UPDATE SET
  subscription_id = EXCLUDED.subscription_id,
  status = EXCLUDED.status,
  reason = EXCLUDED.reason,
  notes = EXCLUDED.notes;

-- Student Activity Log (История действий)
INSERT INTO student_activity_log (student_id, activity_type, description, metadata, created_at) VALUES
-- Действия студента 1
('student-1', 'payment', 'Оплата: 40000.00 ₸', '{"transaction_id": 1, "amount": 40000, "type": "payment"}', NOW() - INTERVAL '10 days'),
('student-1', 'subscription_change', 'Создан новый абонемент. Занятий: 8', '{"subscription_id": "subscription-1", "lessons_count": 8}', NOW() - INTERVAL '10 days'),
('student-1', 'attendance', 'Посетил занятие', '{"lesson_id": "lesson-1", "status": "attended"}', NOW() - INTERVAL '8 days'),
('student-1', 'subscription_change', 'Списано занятие. Осталось: 7', '{"subscription_id": "subscription-1", "lessons_remaining": 7}', NOW() - INTERVAL '8 days'),
('student-1', 'attendance', 'Посетил занятие', '{"lesson_id": "lesson-5", "status": "attended"}', NOW() - INTERVAL '5 days'),
('student-1', 'subscription_change', 'Списано занятие. Осталось: 6', '{"subscription_id": "subscription-1", "lessons_remaining": 6}', NOW() - INTERVAL '5 days'),
('student-1', 'payment', 'Оплата: 8000.00 ₸', '{"transaction_id": 2, "amount": 8000, "type": "payment"}', NOW() - INTERVAL '3 days'),
('student-1', 'note', 'Добавлена заметка', '{"note": "Ученик показывает отличный прогресс"}', NOW() - INTERVAL '2 days'),
-- Действия студента 2
('student-2', 'payment', 'Оплата: 55000.00 ₸', '{"transaction_id": 3, "amount": 55000, "type": "payment"}', NOW() - INTERVAL '5 days'),
('student-2', 'subscription_change', 'Создан новый абонемент. Занятий: 12', '{"subscription_id": "subscription-2", "lessons_count": 12}', NOW() - INTERVAL '5 days'),
('student-2', 'attendance', 'Посетил занятие', '{"lesson_id": "lesson-1", "status": "attended"}', NOW() - INTERVAL '4 days'),
('student-2', 'subscription_change', 'Списано занятие. Осталось: 11', '{"subscription_id": "subscription-2", "lessons_remaining": 11}', NOW() - INTERVAL '4 days'),
('student-2', 'attendance', 'Посетил занятие', '{"lesson_id": "lesson-2", "status": "attended"}', NOW() - INTERVAL '3 days'),
('student-2', 'subscription_change', 'Списано занятие. Осталось: 10', '{"subscription_id": "subscription-2", "lessons_remaining": 10}', NOW() - INTERVAL '3 days'),
-- Действия студента 5
('student-5', 'payment', 'Оплата: 55000.00 ₸', '{"transaction_id": 7, "amount": 55000, "type": "payment"}', NOW() - INTERVAL '40 days'),
('student-5', 'subscription_change', 'Создан новый абонемент. Занятий: 12', '{"subscription_id": "subscription-5", "lessons_count": 12}', NOW() - INTERVAL '40 days'),
('student-5', 'attendance', 'Пропустил занятие', '{"lesson_id": "lesson-1", "status": "missed", "reason": "Болезнь"}', NOW() - INTERVAL '8 days'),
('student-5', 'attendance', 'Посетил занятие', '{"lesson_id": "lesson-5", "status": "attended"}', NOW() - INTERVAL '5 days'),
('student-5', 'subscription_change', 'Списано занятие. Осталось: 2', '{"subscription_id": "subscription-5", "lessons_remaining": 2}', NOW() - INTERVAL '5 days'),
('student-5', 'debt_created', 'Создан долг: 10000.00 ₸', '{"debt_id": 1, "amount": 10000}', NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

-- Student Notes (Заметки об учениках)
INSERT INTO student_notes (student_id, note, created_at) VALUES
('student-1', 'Ученик показывает отличный прогресс по математике. Очень внимателен и выполняет все домашние задания.', NOW() - INTERVAL '2 days'),
('student-1', 'Родители попросили дополнительные материалы по продвинутым темам.', NOW() - INTERVAL '1 day'),
('student-2', 'Хорошее участие на уроках английского. Нужно больше практики разговорной речи.', NOW() - INTERVAL '3 days'),
('student-3', 'Очень талантлив в программировании. Проявляет интерес к продвинутым темам Python.', NOW() - INTERVAL '5 days'),
('student-4', 'Пропустила занятие из-за семейных обстоятельств. Нужно наверстать тему по органической химии.', NOW() - INTERVAL '2 days'),
('student-5', 'Болел на прошлой неделе. Быстро наверстал пропущенный материал.', NOW() - INTERVAL '4 days'),
('student-5', 'Абонемент заканчивается. Обсудили продление с родителями.', NOW() - INTERVAL '1 day'),
('student-7', 'Абонемент заморожен из-за семейной поездки. Возобновит занятия в следующем месяце.', NOW() - INTERVAL '10 days')
ON CONFLICT DO NOTHING;

-- Notifications (Уведомления)
INSERT INTO notifications (student_id, type, message, is_read, created_at) VALUES
('student-5', 'subscription_expiring', 'Ваш абонемент истекает через 5 дней. Осталось всего 2 занятия.', false, NOW() - INTERVAL '1 day'),
('student-5', 'debt_reminder', 'Напоминание об оплате: 10000.00 ₸ через 5 дней', false, NOW() - INTERVAL '1 day'),
('student-6', 'debt_reminder', 'Просроченный платеж: 2000.00 ₸ (просрочен на 10 дней)', false, NOW() - INTERVAL '2 days'),
('student-6', 'subscription_expired', 'Ваш абонемент истек. Пожалуйста, продлите для продолжения занятий.', false, NOW() - INTERVAL '30 days'),
('student-4', 'debt_reminder', 'Напоминание об оплате: 5000.00 ₸ через 15 дней', false, NOW() - INTERVAL '1 hour'),
('student-1', 'subscription_expiring', 'Осталось 5 занятий в абонементе.', true, NOW() - INTERVAL '3 days'),
('student-8', 'subscription_expiring', 'Осталось 7 занятий в абонементе.', false, NOW() - INTERVAL '12 hours')
ON CONFLICT DO NOTHING;

-- Subscription Freezes (Заморозки абонементов)
INSERT INTO subscription_freezes (subscription_id, freeze_start, freeze_end, reason) VALUES
('subscription-7', NOW() - INTERVAL '20 days', NULL, 'Семейная поездка за границу. Вернется в следующем месяце.')
ON CONFLICT DO NOTHING;

VACUUM ANALYZE;

