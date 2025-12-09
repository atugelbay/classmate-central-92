# Быстрое руководство по запуску тестов

## Проблема: "Failed to ping test database"

Если тесты не могут подключиться к БД, выполните следующие шаги:

### Шаг 1: Проверьте подключение к БД

**В Git Bash:**
```bash
cd backend
./scripts/check-db-connection.sh
```

**В PowerShell:**
```powershell
cd backend
.\scripts\check-db-connection.ps1
```

Этот скрипт проверит:
- ✅ Подключение к PostgreSQL
- ✅ Существование БД `classmate_central_db`
- ✅ Наличие таблиц (миграции)

### Шаг 2: Если БД не существует

Создайте БД (если используете другую БД):
```sql
CREATE DATABASE classmate_central;
```

### Шаг 3: Если таблиц нет (миграции не выполнены)

Запустите приложение один раз, чтобы выполнить миграции:

```bash
cd backend

# Используйте ваши credentials из .env (БД classmate_central)
go run ./cmd/api/main.go

# Подождите пока приложение запустится (миграции выполнятся автоматически)
# Затем нажмите Ctrl+C
```

### Шаг 4: Запустите тесты

```bash
# Все тесты
make test

# Только unit тесты (не требуют БД)
make test-unit

# Только integration тесты (требуют БД)
make test-integration
```

## Использование другой БД

По умолчанию используется БД `classmate_central` (из `.env`). Если ваша БД называется по-другому:

```bash
export DB_NAME=your_database_name
make test
```

## Использование других credentials

```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=postgres
export DB_PASSWORD=your_password
export DB_NAME=classmate_central
make test
```

## Быстрая проверка

Если все настроено правильно, вы должны увидеть:

```
=== RUN   TestEmailService_SendVerificationCode
--- PASS: TestEmailService_SendVerificationCode (0.00s)
...
=== RUN   TestAuthHandler_Register
--- PASS: TestAuthHandler_Register (0.02s)
...
```

Если видите `FAIL` - проверьте подключение к БД с помощью скрипта выше.

