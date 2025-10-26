# Скрипт обновления repositories

Для всех repositories нужно:

## 1. Repository методы - добавить параметр `companyID string`:
- `GetAll()` → `GetAll(companyID string)`
- `GetByID(id)` → `GetByID(id, companyID string)`
- `Create(entity)` → `Create(entity, companyID string)`
- `Update(entity)` → `Update(entity, companyID string)`
- `Delete(id)` → `Delete(id, companyID string)`

## 2. SQL queries - добавить фильтр:
- `SELECT ... FROM table` → `SELECT ... FROM table WHERE company_id = $X`
- `SELECT ... WHERE id = $1` → `SELECT ... WHERE id = $1 AND company_id = $2`
- `INSERT INTO table (cols)` → `INSERT INTO table (cols, company_id)`
- `UPDATE table SET ... WHERE id = $1` → `UPDATE table SET ... WHERE id = $1 AND company_id = $X`
- `DELETE FROM table WHERE id = $1` → `DELETE FROM table WHERE id = $1 AND company_id = $2`

## 3. Handler методы - добавить:
```go
companyID := c.GetString("company_id")
```

И передавать в repository методы.

## Список для обновления:
- ✅ student_repository.go + student_handler.go
- ⏳ teacher_repository.go + teacher_handler.go
- ⏳ group_repository.go + group_handler.go  
- ⏳ lesson_repository.go + lesson_handler.go
- ⏳ room_repository.go + room_handler.go
- ⏳ subscription_repository.go + subscription_handler.go
- ⏳ payment_repository.go + payment_handler.go
- ⏳ debt_repository.go + debt_handler.go
- ⏳ tariff_repository.go + tariff_handler.go
- ⏳ lead_repository.go + lead_handler.go

