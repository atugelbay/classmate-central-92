-- Добавление multi-tenancy (поддержка нескольких компаний)

-- 1. Создаем таблицу компаний
CREATE TABLE IF NOT EXISTS companies (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  logo_url TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Добавляем company_id в таблицу users
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id VARCHAR(255);
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_company') THEN
        ALTER TABLE users ADD CONSTRAINT fk_users_company 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Добавляем company_id во все основные таблицы

ALTER TABLE teachers ADD COLUMN IF NOT EXISTS company_id VARCHAR(255);
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_teachers_company') THEN
        ALTER TABLE teachers ADD CONSTRAINT fk_teachers_company 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
END $$;

ALTER TABLE students ADD COLUMN IF NOT EXISTS company_id VARCHAR(255);
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_students_company') THEN
        ALTER TABLE students ADD CONSTRAINT fk_students_company 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
END $$;

ALTER TABLE groups ADD COLUMN IF NOT EXISTS company_id VARCHAR(255);
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_groups_company') THEN
        ALTER TABLE groups ADD CONSTRAINT fk_groups_company 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
END $$;

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS company_id VARCHAR(255);
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_rooms_company') THEN
        ALTER TABLE rooms ADD CONSTRAINT fk_rooms_company 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
END $$;

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS company_id VARCHAR(255);
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_lessons_company') THEN
        ALTER TABLE lessons ADD CONSTRAINT fk_lessons_company 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
END $$;

ALTER TABLE subscription_types ADD COLUMN IF NOT EXISTS company_id VARCHAR(255);
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_subscription_types_company') THEN
        ALTER TABLE subscription_types ADD CONSTRAINT fk_subscription_types_company 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
END $$;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_id VARCHAR(255);
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_leads_company') THEN
        ALTER TABLE leads ADD CONSTRAINT fk_leads_company 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Создаем индексы для быстрой фильтрации по company_id
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_teachers_company ON teachers(company_id);
CREATE INDEX IF NOT EXISTS idx_students_company ON students(company_id);
CREATE INDEX IF NOT EXISTS idx_groups_company ON groups(company_id);
CREATE INDEX IF NOT EXISTS idx_rooms_company ON rooms(company_id);
CREATE INDEX IF NOT EXISTS idx_lessons_company ON lessons(company_id);
CREATE INDEX IF NOT EXISTS idx_subscription_types_company ON subscription_types(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company_id);

-- 5. Создаем дефолтную компанию для существующих данных
INSERT INTO companies (id, name, status) 
VALUES ('default-company', 'Smart Education', 'active')
ON CONFLICT (id) DO NOTHING;

-- 6. Привязываем все существующие данные к дефолтной компании
UPDATE users SET company_id = 'default-company' WHERE company_id IS NULL;
UPDATE teachers SET company_id = 'default-company' WHERE company_id IS NULL;
UPDATE students SET company_id = 'default-company' WHERE company_id IS NULL;
UPDATE groups SET company_id = 'default-company' WHERE company_id IS NULL;
UPDATE rooms SET company_id = 'default-company' WHERE company_id IS NULL;
UPDATE lessons SET company_id = 'default-company' WHERE company_id IS NULL;
UPDATE subscription_types SET company_id = 'default-company' WHERE company_id IS NULL;
UPDATE leads SET company_id = 'default-company' WHERE company_id IS NULL;

-- 7. Делаем company_id обязательным (NOT NULL)
ALTER TABLE users ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE teachers ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE students ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE groups ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE rooms ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE lessons ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE subscription_types ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE leads ALTER COLUMN company_id SET NOT NULL;

-- 8. Создаем триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

