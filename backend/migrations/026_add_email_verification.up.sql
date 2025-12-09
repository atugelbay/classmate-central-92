-- Migration 026: Add email verification columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255);

-- Create index for faster token lookup
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token);

