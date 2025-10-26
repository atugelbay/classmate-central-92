# Seed Data Guide

## Overview

This guide explains the mock data structure and how to use it for testing all features of the student management system.

## Data Files

- **`seed_data.sql`** - Russian version with Cyrillic names (production-like)
- **`seed_test_data.sql`** - English version with Latin names (for international testing)
- **`verify_data.sql`** - Verification queries to check data integrity

## How to Load Data

```bash
# Load Russian data
psql -U postgres -d classmate_central < backend/migrations/seed_data.sql

# Or load English test data
psql -U postgres -d classmate_central < backend/migrations/seed_test_data.sql

# Verify data loaded correctly
psql -U postgres -d classmate_central < backend/migrations/verify_data.sql
```

## Mock Data Coverage

### 8 Students with Different Scenarios

1. **student-1** (Айдар / Aidar) - **Active**
   - Has active subscription with 5 lessons remaining
   - Positive balance: 8,000 KZT
   - Multiple attended lessons
   - Has notes from teachers
   - Has read notifications
   - Complete activity history

2. **student-2** (Айгерім / Aigerim) - **Active**
   - Active subscription with 10 lessons remaining
   - Positive balance: 5,000 KZT
   - Regular attendance
   - Multiple payments
   - Has notes

3. **student-3** (Нұрсұлтан / Nursultan) - **Active**
   - New active subscription (8 lessons)
   - Zero balance
   - Programming courses
   - Has notes

4. **student-4** (Жанна / Zhanna) - **Active**
   - Active subscription with 14 lessons
   - Positive balance: 3,000 KZT
   - Missed one lesson (family emergency)
   - Has pending debt (5,000 KZT)
   - Has notes and notifications

5. **student-5** (Арман / Arman) - **Active** ⚠️ Needs Attention
   - Subscription expiring soon (only 2 lessons left)
   - Negative balance: -10,000 KZT
   - Has overdue debt (10,000 KZT due in 5 days)
   - Missed lessons due to illness
   - Multiple unread notifications
   - Perfect for testing debt/subscription expiry scenarios

6. **student-6** (Камила / Kamila) - **Inactive** ⚠️ Problem Case
   - Expired subscription (30 days ago)
   - Negative balance: -2,000 KZT
   - Overdue debt (10 days overdue)
   - Has unread notifications
   - Perfect for testing inactive student scenarios

7. **student-7** (Ілияс / Iliyas) - **Frozen** ❄️
   - Subscription frozen (family vacation)
   - Positive balance: 10,000 KZT
   - 6 lessons remaining (frozen)
   - Has notes explaining freeze reason

8. **student-8** (Сәуле / Saule) - **Active**
   - Active subscription with 7 lessons
   - Positive balance: 2,000 KZT
   - Regular attendance
   - Has unread notifications

## Testing Different Features

### Profile Tab
- All students have complete profile information
- Different ages (15-17)
- Various subjects enrolled
- Different statuses to test

### Attendance Tab
- Students 1, 2, 5, 8 have attendance records
- Different statuses: attended, missed, cancelled
- Reasons and notes for missed lessons
- Test with `student-1` (regular) and `student-5` (with absences)

### Finance Tab
- **Positive balance**: students 1, 2, 4, 7, 8
- **Negative balance**: students 5, 6
- **Zero balance**: student 3
- Various transaction types: payment, debt, refund
- Different payment methods: card, cash, transfer
- Test debts with students 4, 5, 6

### Subscriptions Tab
- **Active subscriptions**: students 1, 2, 3, 4, 5, 8
- **Expired subscription**: student 6
- **Frozen subscription**: student 7
- Test subscription expiry warnings with student 5
- Test freeze functionality with student 7

### History Tab (Activity Log)
- Students 1, 2, 5 have comprehensive activity logs
- Different activity types:
  - `payment` - payment transactions
  - `subscription_change` - subscription creation/updates
  - `attendance` - lesson attendance
  - `debt_created` - debt creation
  - `note` - notes added
- Test with student-1 for full history

### Notifications
- **Unread notifications**: students 4, 5, 6, 8
- **Read notifications**: student 1
- Different notification types:
  - `subscription_expiring` - subscription running out
  - `debt_reminder` - payment reminders
  - `subscription_expired` - expired subscriptions

## Test Scenarios

### Scenario 1: Happy Path - Active Student
**Use student-1 or student-2**
- View profile with all information
- Check attendance history (all attended)
- View positive balance
- See active subscription with lessons remaining
- Review complete activity history

### Scenario 2: Expiring Subscription Warning
**Use student-5**
- Low lessons remaining (2 out of 12)
- Subscription expiring soon notification
- Negative balance with pending debt
- Test subscription renewal workflow

### Scenario 3: Inactive Student with Debt
**Use student-6**
- Expired subscription
- Negative balance
- Overdue debt payment
- Test reactivation workflow

### Scenario 4: Frozen Subscription
**Use student-7**
- Frozen status
- Active subscription but frozen
- Test freeze/unfreeze functionality
- Check freeze reason in notes

### Scenario 5: Mark Attendance
**Use any upcoming lesson**
- All students are assigned to various lessons
- Test marking attendance (attended, missed, cancelled)
- Verify automatic lesson deduction from subscription
- Check activity log for attendance record

## Database Statistics

After loading, you should see:
- 8 Students (5 active, 1 inactive, 1 frozen, 1 active)
- 8 Student Subscriptions (6 active, 1 expired, 1 frozen)
- 12 Payment Transactions (~488,000 KZT total)
- 8 Student Balance records
- 3 Debt Records
- 11 Lesson Attendance records
- ~21 Student Activity Log entries
- 8 Student Notes
- 7 Notifications (6 unread, 1 read)
- 1 Subscription Freeze

## Verification

Run the verification script:
```bash
psql -U postgres -d classmate_central < backend/migrations/verify_data.sql
```

This will show:
- Count of records in each table
- Status breakdowns
- Balance summaries
- Detailed per-student statistics

## Tips for Testing

1. **Start with student-1**: Complete, clean data for basic feature testing
2. **Use student-5**: Test warning systems and debt management
3. **Use student-6**: Test problem resolution workflows
4. **Use student-7**: Test freeze/unfreeze functionality
5. **Create new students**: Test the full student creation workflow

## Notes

- All timestamps are relative to NOW() so data is always "recent"
- Subscriptions have realistic expiry dates
- Debts have both future and overdue examples
- Activity logs show complete lifecycle of student interactions
- Notifications are linked to real conditions (debt, expiring subscriptions)

