-- Migration 020: Rollback transaction table

-- Drop indexes
DROP INDEX IF EXISTS idx_transaction_created_at;
DROP INDEX IF EXISTS idx_transaction_company;
DROP INDEX IF EXISTS idx_transaction_kind;
DROP INDEX IF EXISTS idx_transaction_subscription;
DROP INDEX IF EXISTS idx_transaction_invoice;
DROP INDEX IF EXISTS idx_transaction_payment;

-- Drop table
DROP TABLE IF EXISTS transaction;

