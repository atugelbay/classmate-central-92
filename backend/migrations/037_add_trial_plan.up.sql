-- ============================================================================
-- Migration: 037_add_trial_plan
-- Description: Adds Trial plan for new registrations (no license assignment to existing companies)
-- ============================================================================

INSERT INTO plans (id, name, description, price_monthly, price_yearly, max_students, max_users, max_teachers, max_branches, features, sort_order)
VALUES (
    'trial',
    'Trial',
    'Пробный период — 1 месяц бесплатно, безлимит',
    0,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '{
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
    }'::jsonb,
    0
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    max_students = EXCLUDED.max_students,
    max_users = EXCLUDED.max_users,
    max_teachers = EXCLUDED.max_teachers,
    max_branches = EXCLUDED.max_branches,
    features = EXCLUDED.features,
    sort_order = EXCLUDED.sort_order,
    updated_at = CURRENT_TIMESTAMP;
