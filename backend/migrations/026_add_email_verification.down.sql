-- Migration 026: Revert email verification columns
DROP INDEX IF EXISTS idx_users_email_verification_token;

ALTER TABLE users 
DROP COLUMN IF EXISTS is_email_verified,
DROP COLUMN IF EXISTS email_verification_token;

