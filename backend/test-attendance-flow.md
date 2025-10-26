# Attendance → Subscription Deduction Flow Test

## Overview
This document describes manual testing procedures for the attendance marking and subscription deduction flow.

## Test Environment Setup

### Prerequisites
- System has migrated data from AlfaCRM
- At least one student with an active subscription
- At least one scheduled lesson with students

### Find Test Data
```sql
-- Find a student with active subscription
SELECT 
  s.id, 
  s.name, 
  ss.id as subscription_id,
  ss.lessons_remaining,
  ss.status
FROM students s
JOIN student_subscriptions ss ON s.id = ss.student_id
WHERE ss.status = 'active' AND ss.lessons_remaining > 0
LIMIT 1;

-- Find a lesson for this student
SELECT 
  l.id as lesson_id,
  l.title,
  l.start_time,
  ls.student_id
FROM lessons l
JOIN lesson_students ls ON l.id = ls.lesson_id
WHERE ls.student_id = '<student_id_from_above>'
AND l.status = 'scheduled'
LIMIT 1;
```

## Test Cases

### Test 1: Mark Attendance as "Attended" - Deduct Lesson

**Pre-conditions:**
- Student ID: `<student_id>`
- Subscription ID: `<subscription_id>`
- Initial lessons_remaining: `<initial_count>`
- Lesson ID: `<lesson_id>`

**Steps:**
1. Open UI and navigate to Schedule page
2. Click on the lesson containing the test student
3. Click "Отметить посещаемость" (Mark Attendance)
4. For the test student, select status "Посетил" (Attended)
5. Add optional notes if desired
6. Click "Сохранить" (Save)

**API Request:**
```bash
POST /api/attendance/mark
Authorization: Bearer <token>
Content-Type: application/json

{
  "lessonId": "<lesson_id>",
  "studentId": "<student_id>",
  "status": "attended",
  "reason": "",
  "notes": "Test attendance marking"
}
```

**Expected Results:**

1. **Attendance Record Created:**
```sql
SELECT * FROM lesson_attendance 
WHERE lesson_id = '<lesson_id>' AND student_id = '<student_id>';
-- Should show: status = 'attended', marked_at = recent timestamp
```

2. **Subscription Deducted:**
```sql
SELECT lessons_remaining, status 
FROM student_subscriptions 
WHERE id = '<subscription_id>';
-- Should show: lessons_remaining = <initial_count - 1>
```

3. **Activity Log Created:**
```sql
SELECT * FROM student_activity_logs 
WHERE student_id = '<student_id>' 
AND activity_type = 'subscription_change'
ORDER BY created_at DESC LIMIT 1;
-- Should contain metadata about lesson deduction
```

4. **Notification Created (if ≤ 3 lessons left):**
```sql
SELECT * FROM notifications 
WHERE student_id = '<student_id>' 
AND type = 'subscription_expiring'
AND is_read = false;
-- Should exist if lessons_remaining <= 3
```

**Pass Criteria:**
- ✅ Attendance marked as "attended"
- ✅ Subscription lessons_remaining decreased by 1
- ✅ Activity log entry created
- ✅ UI shows updated subscription count

---

### Test 2: Mark Attendance as "Attended" - Subscription Depletion

**Pre-conditions:**
- Find student with subscription that has exactly 1 lesson remaining
- Lesson with this student exists

**Steps:**
Same as Test 1

**Expected Results:**

1. **Subscription Deducted and Expired:**
```sql
SELECT lessons_remaining, status 
FROM student_subscriptions 
WHERE id = '<subscription_id>';
-- Should show: lessons_remaining = 0, status = 'expired'
```

2. **Expiration Notification Created:**
```sql
SELECT * FROM notifications 
WHERE student_id = '<student_id>' 
AND type = 'subscription_expired'
AND is_read = false;
-- Should show message about subscription expiration
```

**Pass Criteria:**
- ✅ Subscription status changed to "expired"
- ✅ lessons_remaining = 0
- ✅ Expiration notification created
- ✅ UI shows subscription as expired

---

### Test 3: Mark Attendance as "Missed" - No Deduction

**Pre-conditions:**
- Student with active subscription
- Scheduled lesson with student

**Steps:**
1. Open lesson details
2. Mark attendance for student
3. Select status "Пропустил" (Missed)
4. Add reason (optional)
5. Save

**Expected Results:**

1. **Attendance Recorded:**
```sql
SELECT * FROM lesson_attendance 
WHERE lesson_id = '<lesson_id>' AND student_id = '<student_id>';
-- Should show: status = 'missed'
```

2. **Subscription NOT Deducted:**
```sql
SELECT lessons_remaining 
FROM student_subscriptions 
WHERE id = '<subscription_id>';
-- Should show: lessons_remaining = <unchanged>
```

**Pass Criteria:**
- ✅ Attendance marked as "missed"
- ✅ Subscription lessons_remaining NOT changed
- ✅ Activity log created for attendance only

---

### Test 4: Mark Attendance - Student Has No Active Subscription

**Pre-conditions:**
- Student with NO active subscription (all expired or none)
- Scheduled lesson with this student

**Steps:**
Same as Test 1, mark as "attended"

**Expected Results:**

1. **Attendance Recorded:**
```sql
SELECT * FROM lesson_attendance 
WHERE lesson_id = '<lesson_id>' AND student_id = '<student_id>';
-- Should show: status = 'attended', subscription_id = NULL
```

2. **No Subscription Deduction (gracefully handled):**
- System should not crash
- Attendance should still be recorded
- No errors shown to user

**Pass Criteria:**
- ✅ Attendance marked successfully
- ✅ No errors in backend logs
- ✅ subscription_id is NULL in attendance record
- ✅ UI shows success message

---

## Known Issues / Edge Cases to Document

1. **Multiple Active Subscriptions:**
   - Current behavior: Uses first active subscription found
   - Expected: Should use oldest or explicitly selected one

2. **Frozen Subscriptions:**
   - Current behavior: Unknown - needs testing
   - Expected: Should not deduct from frozen subscriptions

3. **Transaction Rollback:**
   - If any step fails (attendance, deduction, notification), entire transaction should rollback
   - Test by simulating database constraint violations

## Backend Code References

- **Service:** `backend/internal/services/attendance_service.go` line 35-167
- **Handler:** `backend/internal/handlers/lesson_handler.go` (MarkAttendance endpoint)
- **Repository:** `backend/internal/repository/subscription_repository.go`

## Test Results

| Test Case | Date | Tester | Result | Notes |
|-----------|------|--------|--------|-------|
| Test 1    |      |        |        |       |
| Test 2    |      |        |        |       |
| Test 3    |      |        |        |       |
| Test 4    |      |        |        |       |

