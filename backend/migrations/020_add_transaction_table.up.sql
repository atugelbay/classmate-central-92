-- Migration 020: Create transaction table
-- Transaction table for unified financial transactions

-- Create transaction table
CREATE TABLE IF NOT EXISTS transaction (
    id BIGSERIAL PRIMARY KEY,
    payment_id INTEGER REFERENCES payment_transactions(id) ON DELETE SET NULL,
    invoice_id BIGINT REFERENCES invoice(id) ON DELETE SET NULL,
    subscription_id VARCHAR(255) REFERENCES student_subscriptions(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('pay_invoice', 'buy_subscription', 'refund', 'deduction', 'payment')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    company_id VARCHAR(255) NOT NULL REFERENCES companies(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transaction_payment ON transaction(payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transaction_invoice ON transaction(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transaction_subscription ON transaction(subscription_id) WHERE subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transaction_kind ON transaction(kind);
CREATE INDEX IF NOT EXISTS idx_transaction_company ON transaction(company_id);
CREATE INDEX IF NOT EXISTS idx_transaction_created_at ON transaction(created_at);

-- Migrate existing payment_transactions to transaction table
INSERT INTO transaction (
    payment_id,
    amount,
    kind,
    created_at,
    company_id
)
SELECT 
    pt.id as payment_id,
    pt.amount,
    CASE 
        WHEN pt.type = 'payment' THEN 'payment'
        WHEN pt.type = 'refund' THEN 'refund'
        WHEN pt.type = 'debt' THEN 'payment'
        ELSE 'payment'
    END as kind,
    pt.created_at,
    COALESCE(pt.company_id, s.company_id, 'default-company') as company_id
FROM payment_transactions pt
LEFT JOIN students s ON pt.student_id = s.id
WHERE NOT EXISTS (
    SELECT 1 FROM transaction t 
    WHERE t.payment_id = pt.id
)
ON CONFLICT DO NOTHING;

