-- Add original_price and discount_amount columns to student_subscriptions
-- This allows tracking the original price before discounts and the discount amount applied

ALTER TABLE student_subscriptions
ADD COLUMN IF NOT EXISTS original_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0;

-- Update existing subscriptions: set original_price = total_price where original_price is NULL
-- This ensures existing subscriptions have original_price set (assumes no discount was applied)
UPDATE student_subscriptions
SET original_price = total_price
WHERE original_price IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_original_price ON student_subscriptions(original_price);
