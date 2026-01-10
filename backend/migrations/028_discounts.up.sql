-- Discounts
-- Adds discounts and student_discounts tables (multi-tenant + branch-aware)

CREATE TABLE IF NOT EXISTS discounts (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('percentage', 'fixed')),
    value DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    company_id VARCHAR(255) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id VARCHAR(255) REFERENCES branches(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_discounts_company ON discounts(company_id);
CREATE INDEX IF NOT EXISTS idx_discounts_branch ON discounts(branch_id);
CREATE INDEX IF NOT EXISTS idx_discounts_active ON discounts(is_active);

-- Student discounts (applied discounts)
CREATE TABLE IF NOT EXISTS student_discounts (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(255) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    discount_id VARCHAR(255) NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
    applied_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    company_id VARCHAR(255) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id VARCHAR(255) REFERENCES branches(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_student_discounts_student ON student_discounts(student_id);
CREATE INDEX IF NOT EXISTS idx_student_discounts_discount ON student_discounts(discount_id);
CREATE INDEX IF NOT EXISTS idx_student_discounts_company ON student_discounts(company_id);
CREATE INDEX IF NOT EXISTS idx_student_discounts_branch ON student_discounts(branch_id);
CREATE INDEX IF NOT EXISTS idx_student_discounts_active ON student_discounts(is_active);
