-- ============================================================================
-- Migration: 035_add_billing_system
-- Description: Creates billing system tables for SaaS pricing (plans, licenses)
-- Safe: Uses IF NOT EXISTS, does not delete existing data
-- ============================================================================

-- ============================================================================
-- Table: plans
-- Description: SaaS pricing plans (Standard, Professional, Business, Enterprise)
-- ============================================================================
CREATE TABLE IF NOT EXISTS plans (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(12,2) NOT NULL,
    price_yearly DECIMAL(12,2),
    
    -- Limits
    max_students INT,           -- NULL = unlimited
    max_users INT,              -- NULL = unlimited
    max_teachers INT,           -- NULL = unlimited
    max_branches INT,           -- NULL = unlimited
    
    -- Features as JSON
    features JSONB DEFAULT '{}',
    
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Table: company_licenses
-- Description: Active license/subscription for each company
-- ============================================================================
CREATE TABLE IF NOT EXISTS company_licenses (
    id SERIAL PRIMARY KEY,
    company_id VARCHAR(255) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) NOT NULL REFERENCES plans(id),
    
    status VARCHAR(20) DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'suspended', 'cancelled', 'expired')),
    
    -- Trial period
    trial_ends_at TIMESTAMP,
    
    -- Billing period
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    
    -- Custom limits (override plan limits if set)
    custom_max_students INT,
    custom_max_users INT,
    custom_max_teachers INT,
    custom_max_branches INT,
    
    -- Notes for admin
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_company_license UNIQUE(company_id)
);

-- ============================================================================
-- Table: billing_history
-- Description: Payment history for companies
-- ============================================================================
CREATE TABLE IF NOT EXISTS billing_history (
    id SERIAL PRIMARY KEY,
    company_id VARCHAR(255) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KZT',
    
    type VARCHAR(30) CHECK (type IN ('subscription', 'addon', 'overage', 'refund')),
    description TEXT,
    
    payment_method VARCHAR(50),       -- card, kaspi, invoice, etc.
    payment_reference VARCHAR(255),   -- External transaction ID
    
    invoice_number VARCHAR(50),
    invoice_url TEXT,
    
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
    paid_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Table: usage_metrics
-- Description: Monthly usage metrics for billing calculations
-- ============================================================================
CREATE TABLE IF NOT EXISTS usage_metrics (
    id SERIAL PRIMARY KEY,
    company_id VARCHAR(255) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Resource counters
    students_count INT DEFAULT 0,
    users_count INT DEFAULT 0,
    teachers_count INT DEFAULT 0,
    branches_count INT DEFAULT 0,
    
    -- Future: SMS/Email usage
    sms_sent INT DEFAULT 0,
    emails_sent INT DEFAULT 0,
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_company_period UNIQUE(company_id, period_start)
);

-- ============================================================================
-- Table: billing_addons
-- Description: Additional paid modules for companies
-- ============================================================================
CREATE TABLE IF NOT EXISTS billing_addons (
    id SERIAL PRIMARY KEY,
    company_id VARCHAR(255) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    addon_type VARCHAR(50) NOT NULL CHECK (addon_type IN ('sms', 'email', 'extra_branches', 'api_access', 'white_label')),
    
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled')),
    price_monthly DECIMAL(12,2),
    
    -- Addon-specific configuration
    config JSONB DEFAULT '{}',
    
    starts_at TIMESTAMP,
    ends_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_company_addon UNIQUE(company_id, addon_type)
);

-- ============================================================================
-- Indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_company_licenses_company ON company_licenses(company_id);
CREATE INDEX IF NOT EXISTS idx_company_licenses_plan ON company_licenses(plan_id);
CREATE INDEX IF NOT EXISTS idx_company_licenses_status ON company_licenses(status);
CREATE INDEX IF NOT EXISTS idx_company_licenses_period_end ON company_licenses(current_period_end);

CREATE INDEX IF NOT EXISTS idx_billing_history_company ON billing_history(company_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_status ON billing_history(status);
CREATE INDEX IF NOT EXISTS idx_billing_history_created ON billing_history(created_at);

CREATE INDEX IF NOT EXISTS idx_usage_metrics_company ON usage_metrics(company_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_period ON usage_metrics(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_billing_addons_company ON billing_addons(company_id);
CREATE INDEX IF NOT EXISTS idx_billing_addons_type ON billing_addons(addon_type);

-- ============================================================================
-- Trigger for updated_at on company_licenses
-- ============================================================================
CREATE OR REPLACE FUNCTION update_company_licenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_company_licenses_updated_at ON company_licenses;
CREATE TRIGGER trigger_company_licenses_updated_at
    BEFORE UPDATE ON company_licenses
    FOR EACH ROW
    EXECUTE FUNCTION update_company_licenses_updated_at();

-- ============================================================================
-- Seed: Insert default plans
-- ============================================================================
INSERT INTO plans (id, name, description, price_monthly, price_yearly, max_students, max_users, max_teachers, max_branches, features, sort_order)
VALUES 
    ('standard', 'Standard', 'Для небольших образовательных центров', 29900, 299000, 100, 5, 15, 1, 
     '{"crm": true, "export": true, "analytics": "basic"}', 1),
    ('professional', 'Professional', 'Для средних образовательных центров', 49900, 499000, 300, 15, 40, 3, 
     '{"crm": true, "export": true, "analytics": "advanced"}', 2),
    ('business', 'Business', 'Для крупных центров и сетей', 89900, 899000, 700, 30, NULL, 10, 
     '{"crm": true, "export": true, "analytics": "advanced", "priority_support": true}', 3),
    ('enterprise', 'Enterprise', 'Для крупных сетей, безлимит', 149900, 1499000, NULL, NULL, NULL, NULL, 
     '{"crm": true, "export": true, "analytics": "advanced", "priority_support": true, "white_label": true, "custom": true}', 4)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    max_students = EXCLUDED.max_students,
    max_users = EXCLUDED.max_users,
    max_teachers = EXCLUDED.max_teachers,
    max_branches = EXCLUDED.max_branches,
    features = EXCLUDED.features,
    sort_order = EXCLUDED.sort_order,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- Done
-- ============================================================================
