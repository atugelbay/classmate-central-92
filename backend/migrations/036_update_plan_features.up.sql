-- ============================================================================
-- Migration: 036_update_plan_features
-- Description: Updates plan features to match frontend expectations
-- ============================================================================

UPDATE plans SET features = '{
    "groups": true,
    "individual": true,
    "schedule": true,
    "attendance": true,
    "finance": true,
    "subscriptions": true,
    "reports": true,
    "leads": true,
    "advanced_analytics": false,
    "priority_support": false,
    "custom_reports": false,
    "dedicated_manager": false,
    "custom_integration": false
}'::jsonb WHERE id = 'standard';

UPDATE plans SET features = '{
    "groups": true,
    "individual": true,
    "schedule": true,
    "attendance": true,
    "finance": true,
    "subscriptions": true,
    "reports": true,
    "leads": true,
    "advanced_analytics": true,
    "priority_support": false,
    "custom_reports": false,
    "dedicated_manager": false,
    "custom_integration": false
}'::jsonb WHERE id = 'professional';

UPDATE plans SET features = '{
    "groups": true,
    "individual": true,
    "schedule": true,
    "attendance": true,
    "finance": true,
    "subscriptions": true,
    "reports": true,
    "leads": true,
    "advanced_analytics": true,
    "priority_support": true,
    "custom_reports": true,
    "dedicated_manager": false,
    "custom_integration": false
}'::jsonb WHERE id = 'business';

UPDATE plans SET features = '{
    "groups": true,
    "individual": true,
    "schedule": true,
    "attendance": true,
    "finance": true,
    "subscriptions": true,
    "reports": true,
    "leads": true,
    "advanced_analytics": true,
    "priority_support": true,
    "custom_reports": true,
    "dedicated_manager": true,
    "custom_integration": true
}'::jsonb WHERE id = 'enterprise';
