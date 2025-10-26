-- Откат добавления company_id в финансовые таблицы

ALTER TABLE payment_transactions DROP COLUMN IF EXISTS company_id;
ALTER TABLE debt_records DROP COLUMN IF EXISTS company_id;
ALTER TABLE tariffs DROP COLUMN IF EXISTS company_id;
ALTER TABLE student_subscriptions DROP COLUMN IF EXISTS company_id;

-- Опционально (если таблицы существуют)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'group_schedule') THEN
    ALTER TABLE group_schedule DROP COLUMN IF EXISTS company_id;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'lesson_attendance') THEN
    ALTER TABLE lesson_attendance DROP COLUMN IF EXISTS company_id;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'lesson_students') THEN
    ALTER TABLE lesson_students DROP COLUMN IF EXISTS company_id;
  END IF;
END $$;

