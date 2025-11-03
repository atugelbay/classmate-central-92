-- Migration 021: Rollback RBAC system

-- Drop function
DROP FUNCTION IF EXISTS create_default_roles_for_company(VARCHAR);

-- Drop indexes
DROP INDEX IF EXISTS idx_users_role;
DROP INDEX IF EXISTS idx_user_roles_company;
DROP INDEX IF EXISTS idx_user_roles_role;
DROP INDEX IF EXISTS idx_user_roles_user;
DROP INDEX IF EXISTS idx_role_permissions_permission;
DROP INDEX IF EXISTS idx_role_permissions_role;
DROP INDEX IF EXISTS idx_roles_company;

-- Drop tables (in reverse order due to foreign keys)
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS permissions;

-- Remove role_id from users table
ALTER TABLE users DROP COLUMN IF EXISTS role_id;
ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_role;

