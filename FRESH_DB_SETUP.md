# 🔄 Полный сброс БД и миграция

Этот гайд описывает, как полностью сбросить базу данных и применить все миграции заново.

## ✅ Проверено

Структура БД после миграций **полностью корректна** и готова к миграции из AlfaCRM:
- ✅ Все колонки таблицы `lessons` на месте (`subject`, `start_time`, `end_time`, `company_id`)
- ✅ Все foreign keys настроены
- ✅ Таблица `lesson_attendance` имеет правильную структуру
- ✅ Миграция из AlfaCRM работает без ошибок

## 🚀 Автоматический сброс

### Windows
```bash
reset-and-migrate.bat
```

### Linux/Mac
```bash
chmod +x reset-and-migrate.sh
./reset-and-migrate.sh
```

Скрипт автоматически:
1. ⏹️  Остановит backend (если запущен)
2. 🗑️  Удалит и пересоздаст БД
3. ▶️  Запустит backend (миграции применятся автоматически)
4. 📥 Запустит миграцию из AlfaCRM

---

## 🔧 Ручной сброс (пошагово)

### Шаг 1: Остановите backend

**Windows:**
```bash
taskkill /F /IM api.exe
```

**Linux/Mac:**
```bash
pkill -f "api"
```

### Шаг 2: Удалите БД

**Через psql:**
```sql
DROP DATABASE classmate_central;
CREATE DATABASE classmate_central;
```

**Через pgAdmin:**
1. Правый клик на БД → Delete/Drop
2. Создать новую БД с тем же именем

### Шаг 3: Запустите backend

Миграции (001-010) **применятся автоматически** при запуске:

```bash
cd backend
go run cmd/api/main.go
```

В логах вы увидите:
```
Migration migrations/001_init_schema.up.sql executed successfully
Migration migrations/002_leads_and_rooms.up.sql executed successfully
Migration migrations/003_finance.up.sql executed successfully
...
Migration migrations/010_enhance_subscriptions.up.sql executed successfully
All migrations executed successfully
```

### Шаг 4: Миграция из AlfaCRM

**Через Frontend (Рекомендуется):**
1. Откройте http://localhost:5173/settings
2. Вкладка "Миграция"
3. Кнопка "Начать миграцию из AlfaCRM"

**Через терминал:**
```bash
cd migration
node migrate-from-alfacrm.js
```

---

## 📊 Ожидаемые результаты

После успешной миграции вы должны увидеть:

```
✅ Создано записей посещений: ~2700+
📊 Рассчитаны списания для ~175 студентов
💰 Создано транзакций: ~240+
```

### Проверка на примере студента 4207:

```
Текущий баланс: 24,000.02 ₸
Всего оплачено: 32,000.00 ₸  ← (баланс + списания)
Посещено уроков: 3
```

---

## ⚠️ Важные замечания

1. **Backup перед сбросом**: Если у вас есть важные данные, сделайте backup:
   ```bash
   pg_dump -U postgres classmate_central > backup.sql
   ```

2. **Первый пользователь**: После сброса БД вам нужно будет зарегистрироваться заново в frontend.

3. **Данные AlfaCRM**: Миграция загружает данные **из текущего состояния AlfaCRM**, не из backup.

4. **История посещений**: Мигрируются только последние **3 месяца** для оптимизации.

---

## 🧪 Проверка структуры БД

Перед миграцией из AlfaCRM можно проверить структуру БД:

```bash
cd migration
node test-fresh-db-setup.js
```

Вы должны увидеть:
```
╔═══════════════════════════════════════════════════════╗
║  ✅ СТРУКТУРА БД КОРРЕКТНА!                          ║
║  Миграция из AlfaCRM должна работать без проблем.    ║
╚═══════════════════════════════════════════════════════╝
```

---

## 🐛 Troubleshooting

### Проблема: "Migration file not found"
**Решение**: Запускайте backend из корня проекта или из `backend/`, но не из `backend/cmd/api/`.

### Проблема: "constraint already exists"
**Решение**: Миграции 006-010 теперь **идемпотентны** - проверяют существование перед созданием.

### Проблема: "column does not exist" при миграции из AlfaCRM
**Решение**: 
1. Проверьте, что все миграции применились: посмотрите логи backend
2. Запустите `test-fresh-db-setup.js` для проверки структуры
3. Если какая-то миграция не применилась, запустите её вручную

---

## 📚 Связанные документы

- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) - Общий гайд по миграции
- [FINANCIAL_HISTORY_MIGRATION.md](FINANCIAL_HISTORY_MIGRATION.md) - Подробно о финансовой истории
- [QUICKSTART.md](QUICKSTART.md) - Быстрый старт проекта

