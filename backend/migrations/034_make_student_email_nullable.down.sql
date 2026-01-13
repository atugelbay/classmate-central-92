-- Revert: Make student email NOT NULL and restore unique constraint
-- WARNING: This will fail if there are NULL or duplicate email values

ALTER TABLE students ALTER COLUMN email SET NOT NULL;

-- Restore unique constraint on email (original from init_schema)
-- Note: This will only work if all emails are unique
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_email_key') THEN
        ALTER TABLE students ADD CONSTRAINT students_email_key UNIQUE (email);
    END IF;
END $$;
