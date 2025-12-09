# Руководство по тестированию

## Запуск тестов

### Unit тесты (не требуют БД)

```bash
# Linux/macOS
cd backend
make test-unit

# Windows PowerShell
cd backend
go test ./internal/services/... -v
```

### Integration тесты (требуют БД)

**Важно:** Для integration тестов нужна тестовая база данных.

По умолчанию используется БД `classmate_central` (та же, что в `.env`). Если у вас другое имя БД, установите переменную `DB_NAME`.

#### Быстрая настройка:

**Linux/macOS:**
```bash
cd backend
chmod +x scripts/setup-test-db.sh
./scripts/setup-test-db.sh
```

**Windows PowerShell:**
```powershell
cd backend
.\scripts\setup-test-db.ps1
```

#### Ручная настройка:

1. Убедитесь что БД существует (по умолчанию используется `classmate_central` из `.env`)

2. Настройте переменные окружения (если нужно использовать другую БД):
```bash
# Linux/macOS
export DB_NAME=classmate_central
export DB_HOST=localhost
export DB_USER=postgres
export DB_PASSWORD=postgres

# Windows PowerShell
$env:DB_NAME="classmate_central"
$env:DB_HOST="localhost"
$env:DB_USER="postgres"
$env:DB_PASSWORD="postgres"
```

3. Запустите тесты:
```bash
# Linux/macOS
make test-integration

# Windows PowerShell
go test ./internal/handlers/... -v
```

### Все тесты

```bash
# Linux/macOS
make test

# Windows PowerShell
go test ./... -v
```

### С покрытием кода

```bash
# Linux/macOS
make test-coverage
# Откроется coverage.html в браузере

# Windows PowerShell
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out -o coverage.html
```

## Структура тестов

### Unit тесты (`internal/services/*_test.go`)

- **email_service_test.go** - тестирует отправку email без реального SMTP
- **export_service_test.go** - тестирует генерацию PDF/Excel

Эти тесты не требуют БД и работают быстро.

### Integration тесты (`internal/handlers/*_test.go`)

- **auth_handler_test.go** - тестирует регистрацию, вход, валидацию
- **payment_handler_test.go** - тестирует создание транзакций

Эти тесты требуют тестовую БД и выполняются дольше.

## Проблемы и решения

### Ошибка: "Failed to open test database"

**Решение:** Убедитесь что:
1. PostgreSQL запущен
2. БД существует: `classmate_central` (по умолчанию, или установите `DB_NAME` на ваше имя БД)
3. Переменные окружения настроены правильно
4. В БД выполнены миграции (таблицы созданы)

### Ошибка: "table does not exist"

**Решение:** Запустите миграции на тестовой БД:
```bash
# Вариант 1: Используйте существующий .env (БД classmate_central)
# Миграции уже должны быть выполнены, если приложение запускалось
go run ./cmd/api/main.go
# Миграции выполнятся автоматически при старте (если еще не выполнены)

# Вариант 2: Используйте другую БД
export DB_NAME=your_database_name
go run ./cmd/api/main.go
```

### Тесты падают из-за кодировки в PowerShell

**Решение:** Используйте Git Bash или WSL вместо PowerShell для запуска тестов.

## CI/CD

Тесты автоматически запускаются в GitHub Actions при каждом push (см. `.github/workflows/ci.yml`).

