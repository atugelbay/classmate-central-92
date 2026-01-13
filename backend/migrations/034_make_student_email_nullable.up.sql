-- Migration 034: Make student email nullable and remove unique constraints
-- This allows multiple students to have the same email (or no email) within a company

-- First, drop any unique constraints/indexes on email
DO $$ 
BEGIN
    -- Drop unique constraint on email (if exists from initial schema)
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_email_key') THEN
        ALTER TABLE students DROP CONSTRAINT students_email_key;
    END IF;
    
    -- Drop unique constraint on (email, company_id) combination (if exists)
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_email_company_uniq') THEN
        ALTER TABLE students DROP CONSTRAINT students_email_company_uniq;
    END IF;
    
    -- Drop unique index on (email, company_id) if it exists as an index (not constraint)
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'students_email_company_uniq') THEN
        DROP INDEX IF EXISTS students_email_company_uniq;
    END IF;
END $$;

-- Make email column nullable
ALTER TABLE students ALTER COLUMN email DROP NOT NULL;

-- Note: We keep the regular index idx_students_email for query performance
-- but it's not unique, so duplicate emails are allowed
