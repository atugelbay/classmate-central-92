# Payment → Balance Update Flow Test

## Overview
This document describes manual testing procedures for the payment processing and balance update flow.

## Test Environment Setup

### Prerequisites
- System has migrated data from AlfaCRM
- At least one student exists in the system
- Access to Finance module in UI

### Find Test Data
```sql
-- Find a student with existing balance
SELECT 
  s.id, 
  s.name, 
  COALESCE(sb.balance, 0) as current_balance
FROM students s
LEFT JOIN student_balance sb ON s.id = sb.student_id
WHERE s.company_id = '<company_id>'
LIMIT 5;

-- Check student's transaction history
SELECT * FROM payment_transactions 
WHERE student_id = '<student_id>'
ORDER BY created_at DESC;
```

## Test Cases

### Test 1: Create Payment Transaction - Positive Amount

**Pre-conditions:**
- Student ID: `<student_id>`
- Current balance: `<initial_balance>`
- Payment amount: `10000` (10,000 тенге)

**Steps:**
1. Navigate to Finance page in UI
2. Click "Добавить транзакцию" (Add Transaction)
3. Select student from dropdown
4. Enter amount: `10000`
5. Select type: "Оплата" (Payment)
6. Select payment method: "Наличные" (Cash)
7. Add description: "Test payment"
8. Click "Создать" (Create)

**API Request:**
```bash
POST /api/payments
Authorization: Bearer <token>
Content-Type: application/json

{
  "studentId": "<student_id>",
  "amount": 10000,
  "type": "payment",
  "paymentMethod": "cash",
  "description": "Test payment"
}
```

**Expected Results:**

1. **Transaction Created:**
```sql
SELECT * FROM payment_transactions 
WHERE student_id = '<student_id>'
ORDER BY created_at DESC LIMIT 1;
-- Should show: amount = 10000, type = 'payment', payment_method = 'cash'
```

2. **Balance Updated:**
```sql
SELECT balance FROM student_balance 
WHERE student_id = '<student_id>';
-- Should show: balance = <initial_balance + 10000>
```

3. **Activity Log Created:**
```sql
SELECT * FROM student_activity_logs 
WHERE student_id = '<student_id>' 
AND activity_type = 'payment'
ORDER BY created_at DESC LIMIT 1;
-- Should contain transaction metadata
```

4. **UI Updated:**
- Finance page should show new transaction in list
- Student balance should display updated amount
- Transaction should appear in student detail page

**Pass Criteria:**
- ✅ Transaction record created
- ✅ Balance increased by payment amount
- ✅ Activity log entry created
- ✅ UI reflects new balance immediately

---

### Test 2: Create Refund Transaction - Negative Balance

**Pre-conditions:**
- Student with positive balance
- Previous payment exists

**Steps:**
1. Navigate to Finance page
2. Create new transaction with:
   - Student: `<student_id>`
   - Amount: `5000`
   - Type: "Возврат" (Refund)
   - Payment method: "Перевод" (Transfer)
   - Description: "Test refund"
3. Submit

**Expected Results:**

1. **Transaction Created:**
```sql
SELECT * FROM payment_transactions 
WHERE student_id = '<student_id>' AND type = 'refund'
ORDER BY created_at DESC LIMIT 1;
-- Should show: amount = -5000 (negative for refunds)
```

2. **Balance Decreased:**
```sql
SELECT balance FROM student_balance 
WHERE student_id = '<student_id>';
-- Should show: balance = <previous_balance - 5000>
```

**Pass Criteria:**
- ✅ Refund transaction created with negative amount
- ✅ Balance decreased correctly
- ✅ UI shows transaction with distinct refund styling

---

### Test 3: Balance Calculation Verification

**Pre-conditions:**
- Student with multiple transactions

**Steps:**
1. Query all transactions for student
2. Calculate sum manually
3. Compare with stored balance

**Query:**
```sql
-- Calculate expected balance
SELECT 
  s.id,
  s.name,
  SUM(pt.amount) as calculated_balance,
  sb.balance as stored_balance,
  SUM(pt.amount) - sb.balance as difference
FROM students s
LEFT JOIN payment_transactions pt ON s.id = pt.student_id
LEFT JOIN student_balance sb ON s.id = sb.student_id
WHERE s.id = '<student_id>'
GROUP BY s.id, s.name, sb.balance;
```

**Expected Results:**
- `difference` should be 0
- If difference != 0, balance is inconsistent

**Pass Criteria:**
- ✅ Calculated balance matches stored balance
- ✅ No discrepancies found

---

### Test 4: Create Payment for Student with Debt

**Pre-conditions:**
- Student has debt record
- Student has negative or low balance

**Setup:**
```sql
-- Create debt record for testing
INSERT INTO debt_records (student_id, amount, status, notes, company_id)
VALUES ('<student_id>', 5000, 'pending', 'Test debt', '<company_id>');
```

**Steps:**
1. Check student's current debt
2. Create payment transaction (amount >= debt)
3. Verify debt status

**Expected Results:**

1. **Payment Recorded:**
```sql
SELECT * FROM payment_transactions 
WHERE student_id = '<student_id>'
ORDER BY created_at DESC LIMIT 1;
```

2. **Debt Status (manual verification needed):**
```sql
SELECT * FROM debt_records 
WHERE student_id = '<student_id>' AND status = 'pending';
-- Debt handling may need implementation
```

**Pass Criteria:**
- ✅ Payment processed successfully
- ✅ Balance updated correctly
- ⚠️ Debt handling behavior documented (may not be auto-updated)

---

### Test 5: Multiple Concurrent Payments (Race Condition Test)

**Pre-conditions:**
- Student with known balance
- Ability to make multiple API calls

**Steps:**
1. Note initial balance
2. Make 3 simultaneous payment API calls for same student
3. Wait for all to complete
4. Check final balance

**API Calls (simultaneous):**
```bash
# Call 1
POST /api/payments
{ "studentId": "<student_id>", "amount": 1000, "type": "payment", "paymentMethod": "cash", "description": "Test 1" }

# Call 2
POST /api/payments
{ "studentId": "<student_id>", "amount": 2000, "type": "payment", "paymentMethod": "cash", "description": "Test 2" }

# Call 3
POST /api/payments
{ "studentId": "<student_id>", "amount": 3000, "type": "payment", "paymentMethod": "cash", "description": "Test 3" }
```

**Expected Results:**
```sql
-- All 3 transactions should be created
SELECT COUNT(*) FROM payment_transactions 
WHERE student_id = '<student_id>' 
AND description LIKE 'Test%';
-- Should return: 3

-- Balance should reflect all payments
SELECT balance FROM student_balance 
WHERE student_id = '<student_id>';
-- Should show: initial_balance + 6000
```

**Pass Criteria:**
- ✅ All 3 transactions created
- ✅ No transactions lost
- ✅ Balance accurately reflects all payments
- ⚠️ If balance is wrong, indicates race condition issue

---

### Test 6: Invalid Student ID

**Steps:**
1. Attempt to create payment with non-existent student ID

**API Request:**
```bash
POST /api/payments
{ "studentId": "invalid-id-123", "amount": 1000, "type": "payment", "paymentMethod": "cash", "description": "Test" }
```

**Expected Results:**
- HTTP 400 or 404 error
- Error message: "Student not found" or similar
- No transaction created
- No balance record created

**Pass Criteria:**
- ✅ Request rejected with appropriate error
- ✅ No database changes made

---

## Balance Edge Cases

### Negative Balance
**Question:** Can student have negative balance?
- **Expected:** Yes (represents debt)
- **Test:** Create payment with negative amount larger than current balance
- **Verify:** System allows or prevents based on business rules

### Zero Balance
**Question:** Is zero balance handled correctly?
- **Test:** Student with zero balance, make payment, then full refund
- **Verify:** Balance returns to exactly 0

### Very Large Amounts
**Question:** Are there limits on transaction amounts?
- **Test:** Create payment with amount = 999999999
- **Verify:** System accepts or rejects with validation error

## Integration Points

### Related Modules
1. **Subscriptions:** Payment might be related to subscription purchase
2. **Debts:** Payment might be applied to outstanding debts
3. **Reports:** Transactions should appear in financial reports

### Current Implementation Status
- ✅ Payment creates transaction
- ✅ Balance table updated
- ✅ Activity log created
- ⚠️ Automatic debt payment: Unknown - needs testing
- ⚠️ Payment-to-subscription link: Not implemented

## Backend Code References

- **Handler:** `backend/internal/handlers/payment_handler.go` line 25-55
- **Repository:** `backend/internal/repository/payment_repository.go`
  - `CreateTransaction()` - Creates transaction record
  - `UpdateStudentBalance()` - Updates balance table
- **Service:** `backend/internal/services/activity_service.go` - Logs payment activity

## Test Results

| Test Case | Date | Tester | Result | Notes |
|-----------|------|--------|--------|-------|
| Test 1    |      |        |        |       |
| Test 2    |      |        |        |       |
| Test 3    |      |        |        |       |
| Test 4    |      |        |        |       |
| Test 5    |      |        |        |       |
| Test 6    |      |        |        |       |

## Known Issues

### Issue 1: Balance Calculation
- **Description:** 
- **Severity:** 
- **Workaround:** 

### Issue 2: Transaction Types
- **Description:** Need to verify all transaction types are handled correctly
- **Types to test:** payment, refund, debt, subscription_purchase
- **Status:** Pending verification

