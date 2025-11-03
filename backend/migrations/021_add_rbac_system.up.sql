-- Migration 021: Add RBAC (Role-Based Access Control) system
-- This migration adds roles, permissions, and role-permission mappings

-- 1. Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    company_id VARCHAR(255) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_role_name_per_company UNIQUE (name, company_id)
);

-- 2. Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    resource VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_resource_action UNIQUE (resource, action)
);

-- 3. Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id VARCHAR(255) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id VARCHAR(255) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 4. Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id VARCHAR(255) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    company_id VARCHAR(255) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    PRIMARY KEY (user_id, role_id, company_id)
);

-- 5. Add role_id column to users table for quick access to primary role
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id VARCHAR(255);
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_role') THEN
        ALTER TABLE users ADD CONSTRAINT fk_users_role 
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_roles_company ON roles(company_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_company ON user_roles(company_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);

-- 7. Insert default permissions
-- These are system-wide permissions that don't depend on company
INSERT INTO permissions (id, name, resource, action, description) VALUES
    -- Dashboard permissions
    ('perm_dashboard_view', 'dashboard.view', 'dashboard', 'view', 'View dashboard'),
    
    -- Teachers permissions
    ('perm_teachers_view', 'teachers.view', 'teachers', 'view', 'View teachers'),
    ('perm_teachers_create', 'teachers.create', 'teachers', 'create', 'Create teachers'),
    ('perm_teachers_update', 'teachers.update', 'teachers', 'update', 'Update teachers'),
    ('perm_teachers_delete', 'teachers.delete', 'teachers', 'delete', 'Delete teachers'),
    
    -- Students permissions
    ('perm_students_view', 'students.view', 'students', 'view', 'View students'),
    ('perm_students_create', 'students.create', 'students', 'create', 'Create students'),
    ('perm_students_update', 'students.update', 'students', 'update', 'Update students'),
    ('perm_students_delete', 'students.delete', 'students', 'delete', 'Delete students'),
    
    -- Groups permissions
    ('perm_groups_view', 'groups.view', 'groups', 'view', 'View groups'),
    ('perm_groups_create', 'groups.create', 'groups', 'create', 'Create groups'),
    ('perm_groups_update', 'groups.update', 'groups', 'update', 'Update groups'),
    ('perm_groups_delete', 'groups.delete', 'groups', 'delete', 'Delete groups'),
    
    -- Lessons permissions
    ('perm_lessons_view', 'lessons.view', 'lessons', 'view', 'View lessons'),
    ('perm_lessons_create', 'lessons.create', 'lessons', 'create', 'Create lessons'),
    ('perm_lessons_update', 'lessons.update', 'lessons', 'update', 'Update lessons'),
    ('perm_lessons_delete', 'lessons.delete', 'lessons', 'delete', 'Delete lessons'),
    
    -- Schedule permissions
    ('perm_schedule_view', 'schedule.view', 'schedule', 'view', 'View schedule'),
    ('perm_schedule_manage', 'schedule.manage', 'schedule', 'manage', 'Manage schedule'),
    
    -- Leads (CRM) permissions
    ('perm_leads_view', 'leads.view', 'leads', 'view', 'View leads'),
    ('perm_leads_create', 'leads.create', 'leads', 'create', 'Create leads'),
    ('perm_leads_update', 'leads.update', 'leads', 'update', 'Update leads'),
    ('perm_leads_delete', 'leads.delete', 'leads', 'delete', 'Delete leads'),
    
    -- Finance permissions
    ('perm_finance_view', 'finance.view', 'finance', 'view', 'View financial data'),
    ('perm_finance_transactions', 'finance.transactions', 'finance', 'transactions', 'Create and manage transactions'),
    ('perm_finance_tariffs', 'finance.tariffs', 'finance', 'tariffs', 'Manage tariffs'),
    ('perm_finance_debts', 'finance.debts', 'finance', 'debts', 'Manage debts'),
    
    -- Subscriptions permissions
    ('perm_subscriptions_view', 'subscriptions.view', 'subscriptions', 'view', 'View subscriptions'),
    ('perm_subscriptions_create', 'subscriptions.create', 'subscriptions', 'create', 'Create subscriptions'),
    ('perm_subscriptions_update', 'subscriptions.update', 'subscriptions', 'update', 'Update subscriptions'),
    ('perm_subscriptions_delete', 'subscriptions.delete', 'subscriptions', 'delete', 'Delete subscriptions'),
    ('perm_subscriptions_freeze', 'subscriptions.freeze', 'subscriptions', 'freeze', 'Freeze subscriptions'),
    
    -- Attendance permissions
    ('perm_attendance_view', 'attendance.view', 'attendance', 'view', 'View attendance'),
    ('perm_attendance_mark', 'attendance.mark', 'attendance', 'mark', 'Mark attendance'),
    
    -- Rooms permissions
    ('perm_rooms_view', 'rooms.view', 'rooms', 'view', 'View rooms'),
    ('perm_rooms_create', 'rooms.create', 'rooms', 'create', 'Create rooms'),
    ('perm_rooms_update', 'rooms.update', 'rooms', 'update', 'Update rooms'),
    ('perm_rooms_delete', 'rooms.delete', 'rooms', 'delete', 'Delete rooms'),
    
    -- Settings permissions
    ('perm_settings_view', 'settings.view', 'settings', 'view', 'View settings'),
    ('perm_settings_update', 'settings.update', 'settings', 'update', 'Update settings'),
    
    -- Roles and permissions management
    ('perm_roles_view', 'roles.view', 'roles', 'view', 'View roles'),
    ('perm_roles_manage', 'roles.manage', 'roles', 'manage', 'Manage roles and permissions'),
    ('perm_users_manage', 'users.manage', 'users', 'manage', 'Manage user roles and access'),
    
    -- Migration permissions
    ('perm_migration_manage', 'migration.manage', 'migration', 'manage', 'Manage data migration')
ON CONFLICT (id) DO NOTHING;

-- 8. Function to create default roles for a company
-- This function will be called when creating a new company
CREATE OR REPLACE FUNCTION create_default_roles_for_company(company_id_param VARCHAR(255))
RETURNS void AS $$
DECLARE
    admin_role_id VARCHAR(255);
    manager_role_id VARCHAR(255);
    teacher_role_id VARCHAR(255);
    accountant_role_id VARCHAR(255);
    view_only_role_id VARCHAR(255);
BEGIN
    -- Create Admin role
    admin_role_id := company_id_param || '_admin';
    INSERT INTO roles (id, name, description, company_id)
    VALUES (admin_role_id, 'admin', 'Administrator with full access', company_id_param)
    ON CONFLICT (id) DO NOTHING;
    
    -- Assign all permissions to admin
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT admin_role_id, id FROM permissions
    ON CONFLICT DO NOTHING;
    
    -- Create Manager role
    manager_role_id := company_id_param || '_manager';
    INSERT INTO roles (id, name, description, company_id)
    VALUES (manager_role_id, 'manager', 'Manager with most permissions except role management', company_id_param)
    ON CONFLICT (id) DO NOTHING;
    
    -- Assign permissions to manager (all except role management)
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT manager_role_id, id FROM permissions
    WHERE id NOT IN ('perm_roles_manage', 'perm_users_manage')
    ON CONFLICT DO NOTHING;
    
    -- Create Teacher role
    teacher_role_id := company_id_param || '_teacher';
    INSERT INTO roles (id, name, description, company_id)
    VALUES (teacher_role_id, 'teacher', 'Teacher with limited access to students and schedule', company_id_param)
    ON CONFLICT (id) DO NOTHING;
    
    -- Assign permissions to teacher
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT teacher_role_id, id FROM permissions
    WHERE id IN (
        'perm_dashboard_view',
        'perm_students_view',
        'perm_lessons_view',
        'perm_schedule_view',
        'perm_attendance_view',
        'perm_attendance_mark',
        'perm_subscriptions_view',
        'perm_rooms_view'
    )
    ON CONFLICT DO NOTHING;
    
    -- Create Accountant role
    accountant_role_id := company_id_param || '_accountant';
    INSERT INTO roles (id, name, description, company_id)
    VALUES (accountant_role_id, 'accountant', 'Accountant with access to financial data', company_id_param)
    ON CONFLICT (id) DO NOTHING;
    
    -- Assign permissions to accountant
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT accountant_role_id, id FROM permissions
    WHERE id IN (
        'perm_dashboard_view',
        'perm_students_view',
        'perm_finance_view',
        'perm_finance_transactions',
        'perm_finance_tariffs',
        'perm_finance_debts',
        'perm_subscriptions_view',
        'perm_subscriptions_create',
        'perm_subscriptions_update',
        'perm_attendance_view'
    )
    ON CONFLICT DO NOTHING;
    
    -- Create View Only role
    view_only_role_id := company_id_param || '_view_only';
    INSERT INTO roles (id, name, description, company_id)
    VALUES (view_only_role_id, 'view_only', 'View only access without modification rights', company_id_param)
    ON CONFLICT (id) DO NOTHING;
    
    -- Assign view permissions only
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT view_only_role_id, id FROM permissions
    WHERE action = 'view'
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 9. Create default roles for existing companies
DO $$
DECLARE
    company_record RECORD;
BEGIN
    FOR company_record IN SELECT id FROM companies LOOP
        PERFORM create_default_roles_for_company(company_record.id);
    END LOOP;
END $$;

