-- Исправление company_id для старых пользователей

-- 1. Проверь текущее состояние
SELECT id, email, name, company_id FROM users;

-- 2. Обнови пользователей без company_id
UPDATE users 
SET company_id = 'default-company' 
WHERE company_id IS NULL;

-- 3. Проверь что обновилось
SELECT id, email, name, company_id FROM users;

-- 4. Проверь студентов
SELECT company_id, COUNT(*) as count 
FROM students 
GROUP BY company_id;

-- 5. Проверь учителей
SELECT company_id, COUNT(*) as count 
FROM teachers 
GROUP BY company_id;

