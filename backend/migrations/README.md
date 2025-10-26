# Database Migrations Guide

## Overview

This directory contains all database migrations and seed data for the Classmate Central application.

## Migration Files

### Schema Migrations

1. **001_init_schema** - Initial database schema
2. **002_leads_and_rooms** - Leads and rooms functionality
3. **003_finance** - Financial module (payments, debts, balances)
4. **004_subscriptions** - Subscription system
5. **005_student_enhancements** - Student management enhancements (activity log, notes, notifications)

### Seed Data Files

- **seed_data.sql** - Production-like mock data (Russian/Cyrillic)
- **seed_test_data.sql** - Test data (English/Latin)
- **verify_data.sql** - Data verification queries
- **SEED_DATA_GUIDE.md** - Comprehensive guide to using the mock data

## Quick Start

### Apply All Migrations

```bash
# Navigate to backend directory
cd backend

# Run migrations up
migrate -path migrations -database "postgres://user:password@localhost:5432/classmate_central?sslmode=disable" up
```

### Load Mock Data

```bash
# Load Russian version
psql -U postgres -d classmate_central < migrations/seed_data.sql

# OR load English version
psql -U postgres -d classmate_central < migrations/seed_test_data.sql
```

### Verify Data

```bash
psql -U postgres -d classmate_central < migrations/verify_data.sql
```

## Migration Management

### Create New Migration

```bash
migrate create -ext sql -dir migrations -seq migration_name
```

This creates two files:
- `XXX_migration_name.up.sql` - Apply migration
- `XXX_migration_name.down.sql` - Rollback migration

### Rollback Migrations

```bash
# Rollback last migration
migrate -path migrations -database "postgres://..." down 1

# Rollback all migrations
migrate -path migrations -database "postgres://..." down
```

### Check Migration Status

```bash
migrate -path migrations -database "postgres://..." version
```

## Docker Usage

If using Docker Compose:

```bash
# Start database
docker-compose up -d postgres

# Wait for database to be ready
sleep 5

# Apply migrations
docker-compose exec postgres psql -U postgres -d classmate_central < migrations/001_init_schema.up.sql
docker-compose exec postgres psql -U postgres -d classmate_central < migrations/002_leads_and_rooms.up.sql
docker-compose exec postgres psql -U postgres -d classmate_central < migrations/003_finance.up.sql
docker-compose exec postgres psql -U postgres -d classmate_central < migrations/004_subscriptions.up.sql
docker-compose exec postgres psql -U postgres -d classmate_central < migrations/005_student_enhancements.up.sql

# Load seed data
docker-compose exec postgres psql -U postgres -d classmate_central < migrations/seed_data.sql
```

## Database Schema Overview

### Core Tables

- `users` - System users (admins, teachers)
- `teachers` - Teacher profiles
- `students` - Student profiles
- `groups` - Study groups
- `rooms` - Classrooms
- `lessons` - Scheduled lessons
- `leads` - Potential students

### Financial Tables

- `payment_transactions` - All payment records
- `student_balance` - Current student balances
- `debt_records` - Student debts
- `tariffs` - Pricing plans

### Subscription Tables

- `subscription_types` - Available subscription packages
- `student_subscriptions` - Active student subscriptions
- `subscription_freezes` - Subscription freeze records
- `lesson_attendance` - Lesson attendance tracking

### Student Management Tables (New in 005)

- `student_activity_log` - Complete history of student actions
- `student_notes` - Teacher notes about students
- `notifications` - System notifications for students

### Junction Tables

- `student_subjects` - Student-subject relationships
- `student_groups` - Student-group memberships
- `lesson_students` - Lesson-student assignments
- `lead_activities` - Lead interaction history
- `lead_tasks` - Follow-up tasks for leads

## Best Practices

1. **Always test migrations locally first**
   - Apply migration: `up`
   - Verify functionality
   - Test rollback: `down`
   - Reapply: `up`

2. **Write reversible migrations**
   - Every `.up.sql` should have a corresponding `.down.sql`
   - Test both directions

3. **Use transactions**
   - Wrap DDL statements in transactions when possible
   - Ensures atomic application

4. **Backup before production migrations**
   ```bash
   pg_dump classmate_central > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

5. **Document schema changes**
   - Update this README
   - Add comments in migration files
   - Update SEED_DATA_GUIDE.md if affecting test data

## Troubleshooting

### Migration fails with "Dirty database version"

```bash
# Force version (be careful!)
migrate -path migrations -database "postgres://..." force VERSION_NUMBER
```

### Cannot connect to database

Check connection string format:
```
postgres://username:password@host:port/database?sslmode=disable
```

### Seed data conflicts

Clear all data first:
```sql
TRUNCATE TABLE lesson_students, lesson_attendance, student_groups, student_subjects, 
  lessons, groups, students, teachers, leads, rooms, debt_records, payment_transactions, 
  student_balance, tariffs, subscription_freezes, student_subscriptions, subscription_types,
  student_activity_log, student_notes, notifications CASCADE;
```

## Environment-Specific Notes

### Development
- Use `seed_test_data.sql` for quick English testing
- Run verification queries frequently

### Staging
- Use `seed_data.sql` for realistic data
- Mirror production structure

### Production
- Never run seed data scripts
- Always backup before migrations
- Test migrations in staging first
- Plan maintenance windows

## Additional Resources

- [golang-migrate documentation](https://github.com/golang-migrate/migrate)
- [PostgreSQL documentation](https://www.postgresql.org/docs/)
- See `SEED_DATA_GUIDE.md` for detailed mock data guide

