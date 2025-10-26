# ⚡ Быстрый Deploy в Production

## 1️⃣ Перед Push в Railway

```bash
# 1. Закоммить все изменения
git add .
git commit -m "feat: production ready with migration support"
git push origin main
```

## 2️⃣ Настройка Railway (первый раз)

### Backend Service:
```
✅ Уже настроено через railway.json
   Dockerfile: Dockerfile (корневой)
   Build from: / (корень проекта)
```

### Environment Variables:
```bash
# База данных (Railway PostgreSQL)
DATABASE_URL=${PGDATABASE_URL}  # Автоматически
DB_HOST=${PGHOST}               # Автоматически
DB_PORT=${PGPORT}               # Автоматически
DB_NAME=${PGDATABASE}           # Автоматически
DB_USER=${PGUSER}               # Автоматически
DB_PASSWORD=${PGPASSWORD}       # Автоматически

# Backend
PORT=8080
GIN_MODE=release
JWT_SECRET=your-super-secret-key-256-bit  # ВАЖНО: измени!
```

## 3️⃣ После Deploy

### A. Проверь логи:
```bash
railway logs
```

Должно быть:
```
✅ Migration 001_init_schema.up.sql executed successfully
✅ Migration 002_leads_and_rooms.up.sql executed successfully
...
✅ Migration 010_enhance_subscriptions.up.sql executed successfully
✅ All migrations executed successfully
🚀 Server started on :8080
```

### B. Открой Settings → Миграция:
```
1. Введи данные AlfaCRM:
   - URL: https://your-domain.s20.online
   - Email: your@email.com
   - API Key: ***

2. Нажми "Начать миграцию"

3. Жди 2-5 минут

4. Готово! ✅
```

## 🎯 Результат

✅ SQL миграции применены автоматически
✅ Backend работает
✅ Миграция из AlfaCRM работает через UI
✅ Все данные корректно импортированы:
   - Преподаватели
   - Студенты
   - Группы
   - Абонементы (с правильными ценами)
   - История посещений (3 месяца)
   - Финансовые транзакции (платежи + списания)

## ⚠️ Если что-то не работает

```bash
# 1. Проверь логи
railway logs --tail 100

# 2. Проверь переменные окружения
railway variables

# 3. Проверь DATABASE_URL
railway run printenv DATABASE_URL

# 4. Перезапусти backend
railway up
```

## 📞 Support

- [DEPLOY_TO_PRODUCTION.md](./DEPLOY_TO_PRODUCTION.md) - полная инструкция
- [FINANCIAL_HISTORY_MIGRATION.md](./FINANCIAL_HISTORY_MIGRATION.md) - о миграции истории

