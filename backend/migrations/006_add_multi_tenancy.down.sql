-- Откат multi-tenancy

-- Удаляем триггеры и функции
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Удаляем индексы
DROP INDEX IF EXISTS idx_users_company;
DROP INDEX IF EXISTS idx_teachers_company;
DROP INDEX IF EXISTS idx_students_company;
DROP INDEX IF EXISTS idx_groups_company;
DROP INDEX IF EXISTS idx_rooms_company;
DROP INDEX IF EXISTS idx_lessons_company;
DROP INDEX IF EXISTS idx_subscription_types_company;
DROP INDEX IF EXISTS idx_leads_company;

-- Удаляем foreign keys
ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_company;
ALTER TABLE teachers DROP CONSTRAINT IF EXISTS fk_teachers_company;
ALTER TABLE students DROP CONSTRAINT IF EXISTS fk_students_company;
ALTER TABLE groups DROP CONSTRAINT IF EXISTS fk_groups_company;
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS fk_rooms_company;
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS fk_lessons_company;
ALTER TABLE subscription_types DROP CONSTRAINT IF EXISTS fk_subscription_types_company;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS fk_leads_company;

-- Удаляем колонки company_id
ALTER TABLE users DROP COLUMN IF EXISTS company_id;
ALTER TABLE teachers DROP COLUMN IF EXISTS company_id;
ALTER TABLE students DROP COLUMN IF EXISTS company_id;
ALTER TABLE groups DROP COLUMN IF EXISTS company_id;
ALTER TABLE rooms DROP COLUMN IF EXISTS company_id;
ALTER TABLE lessons DROP COLUMN IF EXISTS company_id;
ALTER TABLE subscription_types DROP COLUMN IF EXISTS company_id;
ALTER TABLE leads DROP COLUMN IF EXISTS company_id;

-- Удаляем таблицу компаний
DROP TABLE IF EXISTS companies;

