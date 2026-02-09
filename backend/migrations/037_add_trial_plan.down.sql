-- ============================================================================
-- Migration Rollback: 037_add_trial_plan
-- Description: Removes Trial plan
-- WARNING: Companies with trial plan will lose license reference
-- ============================================================================

DELETE FROM company_licenses WHERE plan_id = 'trial';
DELETE FROM plans WHERE id = 'trial';
