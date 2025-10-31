-- Migration 019: Rollback invoice and invoice_item tables

-- Drop indexes for invoice_item
DROP INDEX IF EXISTS idx_invoice_item_company;
DROP INDEX IF EXISTS idx_invoice_item_invoice;

-- Drop indexes for invoice
DROP INDEX IF EXISTS idx_invoice_due_at;
DROP INDEX IF EXISTS idx_invoice_issued_at;
DROP INDEX IF EXISTS idx_invoice_company;
DROP INDEX IF EXISTS idx_invoice_status;
DROP INDEX IF EXISTS idx_invoice_student;

-- Drop tables
DROP TABLE IF EXISTS invoice_item;
DROP TABLE IF EXISTS invoice;

