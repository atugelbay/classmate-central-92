-- Drop indexes
DROP INDEX IF EXISTS idx_debt_records_status;
DROP INDEX IF EXISTS idx_debt_records_student;
DROP INDEX IF EXISTS idx_payment_transactions_date;
DROP INDEX IF EXISTS idx_payment_transactions_student;

-- Drop tables
DROP TABLE IF EXISTS debt_records;
DROP TABLE IF EXISTS tariffs;
DROP TABLE IF EXISTS student_balance;
DROP TABLE IF EXISTS payment_transactions;

