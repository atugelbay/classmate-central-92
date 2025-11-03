-- Migration 023: Add version column for optimistic locking
-- This prevents race conditions when multiple users update the same record

-- Add version column to critical tables that require concurrent update protection

-- Student balance (critical for financial operations)
ALTER TABLE student_balance ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 0 NOT NULL;

-- Student subscriptions (critical for attendance and billing)
ALTER TABLE student_subscriptions ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 0 NOT NULL;

-- Create indexes for better query performance with version
CREATE INDEX IF NOT EXISTS idx_student_balance_version ON student_balance(student_id, version);
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_version ON student_subscriptions(id, version);

