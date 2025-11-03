-- Ensure idempotency for deduction transactions per lesson by description
-- Partial unique index for 'deduction' records with lesson ID in description
CREATE UNIQUE INDEX IF NOT EXISTS ux_payment_deduction_lesson
ON payment_transactions (company_id, student_id, type, description)
WHERE type = 'deduction' AND description LIKE '%Урок ID:%';


