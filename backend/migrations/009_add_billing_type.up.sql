-- Add billing_type to subscription_types
ALTER TABLE subscription_types 
ADD COLUMN IF NOT EXISTS billing_type VARCHAR(50) DEFAULT 'per_lesson';

-- Add comment
COMMENT ON COLUMN subscription_types.billing_type IS 'Type of billing: per_lesson, monthly, unlimited';

-- Update existing records to per_lesson (default)
UPDATE subscription_types SET billing_type = 'per_lesson' WHERE billing_type IS NULL;

-- Create index for filtering by billing type
CREATE INDEX IF NOT EXISTS idx_subscription_types_billing_type ON subscription_types(billing_type);

