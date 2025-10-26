# ⚠️ НУЖНО ПРИМЕНИТЬ SQL МИГРАЦИЮ!

## Проблема:
500 ошибки на `/api/tariffs`, `/api/payments/transactions`, `/api/debts`

**Причина:** В БД нет колонки `company_id` в этих таблицах!

---

## 🔧 Решение:

### Вариант 1: Через psql (рекомендуется)
```bash
psql -U postgres -d classmate_central -f backend/migrations/006_add_multi_tenancy.up.sql
```

### Вариант 2: Через pgAdmin
1. Открой pgAdmin
2. Подключись к БД `classmate_central`
3. Query Tool
4. Скопируй содержимое `backend/migrations/006_add_multi_tenancy.up.sql`
5. Выполни

### Вариант 3: Быстро через PowerShell
```powershell
$env:PGPASSWORD="твой_пароль"
psql -U postgres -d classmate_central -f backend\migrations\006_add_multi_tenancy.up.sql
```

---

## Что добавит миграция:
1. ✅ Таблицу `companies`
2. ✅ Колонку `company_id` во все таблицы:
   - users
   - teachers
   - rooms
   - subscription_types
   - groups
   - group_schedule
   - students
   - student_subscriptions
   - **payment_transactions** ← нужно для транзакций
   - **debt_records** ← нужно для долгов
   - lessons
   - lesson_attendance
   - lesson_students
   - **tariffs** ← нужно для тарифов (если таблица существует)

3. ✅ Foreign key constraints
4. ✅ Row Level Security policies

---

## После применения:
Перезапусти backend и проверь!

```bash
cd backend
go run .\cmd\api\main.go
```

**Тогда все 500 ошибки исчезнут!** ✅

