-- Добавление company_id в финансовые таблицы

-- 1. Добавляем company_id в payment_transactions
DO $$
BEGIN
  ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS company_id VARCHAR(255);
  UPDATE payment_transactions SET company_id = 'default-company' WHERE company_id IS NULL;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payment_transactions_company') THEN
    ALTER TABLE payment_transactions ADD CONSTRAINT fk_payment_transactions_company 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_transactions' AND column_name = 'company_id' AND is_nullable = 'YES') THEN
    ALTER TABLE payment_transactions ALTER COLUMN company_id SET NOT NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_payment_transactions_company ON payment_transactions(company_id);

-- 2. Добавляем company_id в debt_records
DO $$
BEGIN
  ALTER TABLE debt_records ADD COLUMN IF NOT EXISTS company_id VARCHAR(255);
  UPDATE debt_records SET company_id = 'default-company' WHERE company_id IS NULL;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_debt_records_company') THEN
    ALTER TABLE debt_records ADD CONSTRAINT fk_debt_records_company 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'debt_records' AND column_name = 'company_id' AND is_nullable = 'YES') THEN
    ALTER TABLE debt_records ALTER COLUMN company_id SET NOT NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_debt_records_company ON debt_records(company_id);

-- 3. Добавляем company_id в tariffs
DO $$
BEGIN
  ALTER TABLE tariffs ADD COLUMN IF NOT EXISTS company_id VARCHAR(255);
  UPDATE tariffs SET company_id = 'default-company' WHERE company_id IS NULL;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tariffs_company') THEN
    ALTER TABLE tariffs ADD CONSTRAINT fk_tariffs_company 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tariffs' AND column_name = 'company_id' AND is_nullable = 'YES') THEN
    ALTER TABLE tariffs ALTER COLUMN company_id SET NOT NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_tariffs_company ON tariffs(company_id);

-- 4. Добавляем company_id в student_subscriptions
DO $$
BEGIN
  ALTER TABLE student_subscriptions ADD COLUMN IF NOT EXISTS company_id VARCHAR(255);
  UPDATE student_subscriptions SET company_id = 'default-company' WHERE company_id IS NULL;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_subscriptions_company') THEN
    ALTER TABLE student_subscriptions ADD CONSTRAINT fk_student_subscriptions_company 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_subscriptions' AND column_name = 'company_id' AND is_nullable = 'YES') THEN
    ALTER TABLE student_subscriptions ALTER COLUMN company_id SET NOT NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_company ON student_subscriptions(company_id);

-- 5. Добавляем company_id в group_schedule (если таблица существует)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'group_schedule') THEN
    ALTER TABLE group_schedule ADD COLUMN IF NOT EXISTS company_id VARCHAR(255);
    UPDATE group_schedule SET company_id = 'default-company' WHERE company_id IS NULL;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_group_schedule_company') THEN
      ALTER TABLE group_schedule ADD CONSTRAINT fk_group_schedule_company 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'group_schedule' AND column_name = 'company_id' AND is_nullable = 'YES') THEN
      ALTER TABLE group_schedule ALTER COLUMN company_id SET NOT NULL;
    END IF;
    
    CREATE INDEX IF NOT EXISTS idx_group_schedule_company ON group_schedule(company_id);
  END IF;
END $$;

-- 6. Добавляем company_id в lesson_attendance (если таблица существует)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'lesson_attendance') THEN
    ALTER TABLE lesson_attendance ADD COLUMN IF NOT EXISTS company_id VARCHAR(255);
    UPDATE lesson_attendance SET company_id = 'default-company' WHERE company_id IS NULL;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_lesson_attendance_company') THEN
      ALTER TABLE lesson_attendance ADD CONSTRAINT fk_lesson_attendance_company 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lesson_attendance' AND column_name = 'company_id' AND is_nullable = 'YES') THEN
      ALTER TABLE lesson_attendance ALTER COLUMN company_id SET NOT NULL;
    END IF;
    
    CREATE INDEX IF NOT EXISTS idx_lesson_attendance_company ON lesson_attendance(company_id);
  END IF;
END $$;

-- 7. Добавляем company_id в lesson_students (если таблица существует)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'lesson_students') THEN
    ALTER TABLE lesson_students ADD COLUMN IF NOT EXISTS company_id VARCHAR(255);
    UPDATE lesson_students SET company_id = 'default-company' WHERE company_id IS NULL;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_lesson_students_company') THEN
      ALTER TABLE lesson_students ADD CONSTRAINT fk_lesson_students_company 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lesson_students' AND column_name = 'company_id' AND is_nullable = 'YES') THEN
      ALTER TABLE lesson_students ALTER COLUMN company_id SET NOT NULL;
    END IF;
    
    CREATE INDEX IF NOT EXISTS idx_lesson_students_company ON lesson_students(company_id);
  END IF;
END $$;

