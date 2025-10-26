-- ПРОВЕРКА ИНДИВИДУАЛЬНЫХ ЗАНЯТИЙ И ФЕЙКОВЫХ ГРУПП
-- Запуск: psql -h HOST -U USER -d DATABASE -f check-individual-lessons.sql

\echo '========================================='
\echo 'ПРОВЕРКА МИГРАЦИИ ИНДИВИДУАЛЬНЫХ ЗАНЯТИЙ'
\echo '========================================='
\echo ''

-- 1. Проверка фейковых групп
\echo '1. ФЕЙКОВЫЕ ГРУППЫ (должно быть 0):'
\echo '-----------------------------------'
SELECT 
  id, 
  name, 
  LEFT(description, 50) as description
FROM groups 
WHERE id LIKE 'ind_%' 
  AND description LIKE '%автоматически создано при миграции%'
ORDER BY name
LIMIT 10;

\echo ''
\echo 'Количество фейковых групп:'
SELECT COUNT(*) as fake_groups_count 
FROM groups 
WHERE id LIKE 'ind_%' 
  AND description LIKE '%автоматически создано при миграции%';

\echo ''
\echo '-----------------------------------'

-- 2. Проверка индивидуальных уроков
\echo ''
\echo '2. ИНДИВИДУАЛЬНЫЕ УРОКИ (без group_id):'
\echo '-----------------------------------'
SELECT 
  id,
  title,
  teacher_id,
  room_id,
  TO_CHAR(start_time, 'YYYY-MM-DD HH24:MI') as start_time,
  status
FROM lessons 
WHERE group_id IS NULL
ORDER BY start_time DESC
LIMIT 10;

\echo ''
\echo 'Количество индивидуальных уроков:'
SELECT COUNT(*) as individual_lessons_count 
FROM lessons 
WHERE group_id IS NULL;

\echo ''
\echo 'Статистика по статусам:'
SELECT 
  status,
  COUNT(*) as count
FROM lessons 
WHERE group_id IS NULL
GROUP BY status
ORDER BY count DESC;

\echo ''
\echo '-----------------------------------'

-- 3. Проверка связей студент-урок для индивидуальных
\echo ''
\echo '3. СВЯЗИ СТУДЕНТ-УРОК (индивидуальные):'
\echo '-----------------------------------'
SELECT 
  l.id as lesson_id,
  l.title,
  s.name as student_name,
  TO_CHAR(l.start_time, 'YYYY-MM-DD HH24:MI') as start_time
FROM lessons l
JOIN lesson_students ls ON l.id = ls.lesson_id
JOIN students s ON ls.student_id = s.id
WHERE l.group_id IS NULL
ORDER BY l.start_time DESC
LIMIT 10;

\echo ''
\echo 'Количество связей для индивидуальных уроков:'
SELECT COUNT(*) as individual_lesson_students 
FROM lesson_students ls
JOIN lessons l ON ls.lesson_id = l.id
WHERE l.group_id IS NULL;

\echo ''
\echo '-----------------------------------'

-- 4. Групповые уроки (для сравнения)
\echo ''
\echo '4. ГРУППОВЫЕ УРОКИ (с group_id) - для сравнения:'
\echo '-----------------------------------'
SELECT 
  id,
  title,
  group_id,
  teacher_id,
  TO_CHAR(start_time, 'YYYY-MM-DD HH24:MI') as start_time,
  status
FROM lessons 
WHERE group_id IS NOT NULL
ORDER BY start_time DESC
LIMIT 5;

\echo ''
\echo 'Количество групповых уроков:'
SELECT COUNT(*) as group_lessons_count 
FROM lessons 
WHERE group_id IS NOT NULL;

\echo ''
\echo '-----------------------------------'

-- 5. Сводка
\echo ''
\echo '5. СВОДНАЯ СТАТИСТИКА:'
\echo '-----------------------------------'
SELECT 
  'Всего групп' as metric,
  COUNT(*) as count
FROM groups
UNION ALL
SELECT 
  'Фейковые группы (ind_*)',
  COUNT(*)
FROM groups 
WHERE id LIKE 'ind_%'
UNION ALL
SELECT 
  'Всего уроков',
  COUNT(*)
FROM lessons
UNION ALL
SELECT 
  'Групповые уроки',
  COUNT(*)
FROM lessons 
WHERE group_id IS NOT NULL
UNION ALL
SELECT 
  'Индивидуальные уроки',
  COUNT(*)
FROM lessons 
WHERE group_id IS NULL;

\echo ''
\echo '========================================='
\echo 'РЕЗУЛЬТАТЫ ПРОВЕРКИ:'
\echo '========================================='
\echo 'Если "Фейковые группы (ind_*)" = 0, то миграция прошла правильно! ✅'
\echo 'Если "Фейковые группы (ind_*)" > 0, запустите cleanup-fake-groups.js'
\echo '========================================='
\echo ''

