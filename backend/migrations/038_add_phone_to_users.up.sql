-- ============================================================================
-- Migration: 038_add_phone_to_users
-- Description: Adds phone column to users table for registration
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
