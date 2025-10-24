-- Payment transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(255) REFERENCES students(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    type VARCHAR(50) NOT NULL, -- payment, refund, debt
    payment_method VARCHAR(50) NOT NULL, -- cash, card, transfer, other
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Student balance
CREATE TABLE IF NOT EXISTS student_balance (
    student_id VARCHAR(255) PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
    balance DECIMAL(10, 2) DEFAULT 0.00,
    last_payment_date TIMESTAMP
);

-- Tariffs/Pricing plans
CREATE TABLE IF NOT EXISTS tariffs (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    duration_days INTEGER, -- NULL for unlimited
    lesson_count INTEGER, -- NULL for unlimited
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Debt records
CREATE TABLE IF NOT EXISTS debt_records (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(255) REFERENCES students(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    due_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending', -- pending, paid
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_student ON payment_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_date ON payment_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_debt_records_student ON debt_records(student_id);
CREATE INDEX IF NOT EXISTS idx_debt_records_status ON debt_records(status);

