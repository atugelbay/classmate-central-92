-- Migration 018: Create subscription_consumption table
-- Subscription consumption tracks lesson deductions from subscriptions

-- Create subscription_consumption table
CREATE TABLE IF NOT EXISTS subscription_consumption (
    id BIGSERIAL PRIMARY KEY,
    subscription_id VARCHAR(255) NOT NULL REFERENCES student_subscriptions(id) ON DELETE CASCADE,
    attendance_id INTEGER NOT NULL REFERENCES lesson_attendance(id) ON DELETE CASCADE,
    units INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    company_id VARCHAR(255) NOT NULL REFERENCES companies(id) ON DELETE CASCADE
);

-- Create unique index to prevent double charging
CREATE UNIQUE INDEX IF NOT EXISTS ux_sub_charge 
ON subscription_consumption(subscription_id, attendance_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscription_consumption_subscription ON subscription_consumption(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_consumption_attendance ON subscription_consumption(attendance_id);
CREATE INDEX IF NOT EXISTS idx_subscription_consumption_company ON subscription_consumption(company_id);
CREATE INDEX IF NOT EXISTS idx_subscription_consumption_created_at ON subscription_consumption(created_at);

-- Migrate data from lesson_attendance where subscription_id exists
-- Create consumption records for existing attendance records that have subscriptions
INSERT INTO subscription_consumption (
    subscription_id,
    attendance_id,
    units,
    created_at,
    company_id
)
SELECT 
    la.subscription_id,
    la.id as attendance_id,
    1 as units, -- Default to 1 unit per attendance
    COALESCE(la.marked_at, la.created_at, now()) as created_at,
    COALESCE(la.company_id, ss.company_id, 'default-company') as company_id
FROM lesson_attendance la
INNER JOIN student_subscriptions ss ON la.subscription_id = ss.id
WHERE la.subscription_id IS NOT NULL
  AND la.status = 'attended' -- Only migrated attended lessons
  AND NOT EXISTS (
      SELECT 1 FROM subscription_consumption sc 
      WHERE sc.subscription_id = la.subscription_id 
      AND sc.attendance_id = la.id
  )
ON CONFLICT DO NOTHING;

