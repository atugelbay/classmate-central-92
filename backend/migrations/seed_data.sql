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
INSERT INTO students (id, name, age, email, phone) VALUES
('student-1', 'Айдар Серікбаев', 16, 'aidar.serikbayev@example.com', '+7 (701) 111-2222'),
('student-2', 'Айгерім Қасымова', 15, 'aigerim.kassymova@example.com', '+7 (702) 222-3333'),
('student-3', 'Нұрсұлтан Әбдіров', 17, 'nursultan.abdirov@example.com', '+7 (705) 333-4444'),
('student-4', 'Жанна Оразбаева', 16, 'zhanna.orazbayeva@example.com', '+7 (708) 444-5555'),
('student-5', 'Арман Тұрсынов', 15, 'arman.tursynov@example.com', '+7 (777) 555-6666'),
('student-6', 'Камила Нұрланқызы', 16, 'kamila.nurlankzy@example.com', '+7 (701) 666-7777'),
('student-7', 'Ілияс Бауыржанов', 17, 'iliyas.bauyrzhan@example.com', '+7 (702) 777-8888'),
('student-8', 'Сәуле Қайратқызы', 15, 'saule.kairatkzy@example.com', '+7 (705) 888-9999')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  age = EXCLUDED.age,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone;

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

VACUUM ANALYZE;

