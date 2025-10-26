# 🔧 ПРИМЕНИТЬ МИГРАЦИЮ 007

## Проблема:
В миграции 006 забыли добавить `company_id` в финансовые таблицы!

## Решение:
Создана новая миграция `007_add_company_to_finance.up.sql`

---

## 📋 Что добавит миграция 007:

### company_id в таблицы:
1. ✅ `payment_transactions` ← для транзакций
2. ✅ `debt_records` ← для долгов
3. ✅ `tariffs` ← для тарифов
4. ✅ `student_subscriptions` ← для абонементов
5. ✅ `group_schedule` (если существует)
6. ✅ `lesson_attendance` (если существует)
7. ✅ `lesson_students` (если существует)

### Для каждой таблицы:
- ✅ Добавляет колонку `company_id`
- ✅ Устанавливает `'default-company'` для существующих записей
- ✅ Добавляет foreign key constraint
- ✅ Делает колонку NOT NULL
- ✅ Создает индекс для быстрой фильтрации

---

## 🚀 Как применить:

### Вариант 1: Через psql
```bash
psql -U postgres -d classmate_central -f backend/migrations/007_add_company_to_finance.up.sql
```

### Вариант 2: Через PowerShell
```powershell
$env:PGPASSWORD="твой_пароль"
psql -U postgres -d classmate_central -f backend\migrations\007_add_company_to_finance.up.sql
```

### Вариант 3: Через pgAdmin
1. Query Tool в БД `classmate_central`
2. Открой файл `backend/migrations/007_add_company_to_finance.up.sql`
3. Execute

---

## ✅ После применения:

Перезапусти backend:
```bash
cd backend
go run .\cmd\api\main.go
```

**Все 500 ошибки исчезнут!**
- ✅ `/api/tariffs` → 200
- ✅ `/api/payments/transactions` → 200
- ✅ `/api/debts` → 200

---

## 🎯 Проверка:
После применения проверь в pgAdmin:
```sql
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE column_name = 'company_id' 
AND table_name IN ('payment_transactions', 'debt_records', 'tariffs', 'student_subscriptions')
ORDER BY table_name;
```

Должно показать 4 строки (или больше, если есть другие таблицы).

