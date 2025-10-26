-- Проверка данных после миграции

-- 1. Компании
SELECT 'КОМПАНИИ:' as section;
SELECT id, name, status FROM companies;

-- 2. Пользователи
SELECT 'ПОЛЬЗОВАТЕЛИ:' as section;
SELECT id, email, name, company_id FROM users;

-- 3. Учителя
SELECT 'УЧИТЕЛЯ:' as section;
SELECT id, name, email, subject, status, company_id FROM teachers LIMIT 10;

-- 4. Количество записей по компаниям
SELECT 'СТАТИСТИКА ПО КОМПАНИЯМ:' as section;
SELECT 
  c.name as company_name,
  c.id as company_id,
  (SELECT COUNT(*) FROM teachers WHERE company_id = c.id) as teachers_count,
  (SELECT COUNT(*) FROM students WHERE company_id = c.id) as students_count,
  (SELECT COUNT(*) FROM groups WHERE company_id = c.id) as groups_count,
  (SELECT COUNT(*) FROM lessons WHERE company_id = c.id) as lessons_count
FROM companies c;

