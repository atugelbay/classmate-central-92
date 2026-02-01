-- ============================================================================
-- Migration: 036_update_plan_features (rollback)
-- Description: Reverts plan features to original values
-- ============================================================================

UPDATE plans SET features = '{"crm": true, "export": true, "analytics": "basic"}'::jsonb 
WHERE id = 'standard';

UPDATE plans SET features = '{"crm": true, "export": true, "analytics": "advanced"}'::jsonb 
WHERE id = 'professional';

UPDATE plans SET features = '{"crm": true, "export": true, "analytics": "advanced", "priority_support": true}'::jsonb 
WHERE id = 'business';

UPDATE plans SET features = '{"crm": true, "export": true, "analytics": "advanced", "priority_support": true, "white_label": true, "custom": true}'::jsonb 
WHERE id = 'enterprise';
