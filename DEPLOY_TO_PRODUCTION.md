# 🚀 Деплой в Production (Railway)

## ✅ Что будет работать автоматически

### 1. SQL Миграции БД (001-010)
- ✅ Применяются **автоматически** при старте backend
- ✅ Идемпотентные (безопасно запускать несколько раз)
- ✅ Включены все 10 миграций:
  - 001: Init schema
  - 002: Leads and rooms
  - 003: Finance
  - 004: Subscriptions
  - 005: Student enhancements
  - 006: Multi-tenancy
  - 007: Company to finance
  - 008: Fix missing columns
  - 009: Add billing type
  - 010: Enhance subscriptions

### 2. Миграция из AlfaCRM через UI
- ✅ Теперь **поддерживается** в production
- ✅ Dockerfile обновлен для поддержки Node.js
- ✅ Migration скрипты включены в Docker image

---

## 📋 Чеклист перед деплоем

### Backend (Railway)

1. **Build Settings автоматически настроены** (через `railway.json`):
   ```json
   {
     "build": {
       "builder": "DOCKERFILE",
       "dockerfilePath": "Dockerfile"  // Корневой Dockerfile
     }
   }
   ```
   ✅ **Ничего менять не нужно!**

2. **Проверь файлы:**
   - ✅ `Dockerfile` (корневой) - включает backend + migration
   - ✅ `railway.json` - настроен автоматически
   - ✅ `migration/migrate-from-alfacrm.js` - скрипт миграции

3. **Установи Environment Variables:**
   ```bash
   # Database (от Railway PostgreSQL)
   DATABASE_URL=postgres://...
   DB_HOST=...
   DB_PORT=5432
   DB_NAME=railway
   DB_USER=postgres
   DB_PASSWORD=...
   
   # JWT
   JWT_SECRET=your-super-secret-key-change-in-production
   
   # Backend
   PORT=8080
   GIN_MODE=release
   ```

4. **Commit и Push изменения:**
   ```bash
   git add .
   git commit -m "feat: add production migration support"
   git push origin main
   ```

5. **Railway автоматически задеплоит** 🎉

---

## 🔄 Миграция данных в Production

### Через UI (Settings → Миграция):

1. Открой `https://your-app.railway.app/settings`
2. Вкладка **"Миграция"**
3. Заполни данные:
   - **AlfaCRM URL**: `https://your-domain.s20.online`
   - **Email**: `your@email.com`
   - **API Key**: `your-alfacrm-api-key`
4. Нажми **"Начать миграцию"**
5. Дождись завершения (2-5 минут)

### Что будет мигрировано:
- ✅ Преподаватели
- ✅ Комнаты
- ✅ Тарифы (с правильным `billing_type`)
- ✅ Группы + расписания
- ✅ Студенты
- ✅ Индивидуальные занятия
- ✅ Связи студент-группа
- ✅ Абонементы (с реальными ценами из AlfaCRM)
- ✅ **История посещений (последние 3 месяца)**
- ✅ **Финансовые транзакции** (платежи + списания)
- ✅ Долги
- ✅ Генерация уроков (на 3 месяца вперед)

---

## 🐛 Troubleshooting

### Миграция не запускается

**Проблема:** "Migration script failed: exec: "node": executable file not found"

**Решение:** Убедись, что Dockerfile обновлен (должен быть `RUN apk add nodejs npm`)

```bash
# Проверь логи Railway
railway logs
```

---

### Миграция падает с ошибкой БД

**Проблема:** "permission denied for table..."

**Решение:** Проверь DATABASE_URL и права пользователя:

```sql
-- Выполни в Railway PostgreSQL
GRANT ALL PRIVILEGES ON DATABASE railway TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
```

---

### Данные не отображаются после миграции

**Проблема:** Пустые списки студентов/групп

**Возможные причины:**
1. Company ID не совпадает (проверь через Settings → User Info)
2. Multi-tenancy изоляция работает

**Решение:**
```sql
-- Проверь данные в БД
SELECT COUNT(*) FROM students WHERE company_id = 'your-company-id';
SELECT COUNT(*) FROM groups WHERE company_id = 'your-company-id';
```

---

## 📊 Проверка после деплоя

### 1. Проверь миграции БД
```bash
# В логах Railway должно быть:
✅ Migration 001_init_schema.up.sql executed successfully
✅ Migration 002_leads_and_rooms.up.sql executed successfully
...
✅ Migration 010_enhance_subscriptions.up.sql executed successfully
✅ All migrations executed successfully
```

### 2. Проверь API
```bash
curl https://your-app.railway.app/api/health
# Должно вернуть: {"status": "ok"}
```

### 3. Проверь Frontend
- Открой `https://your-frontend.railway.app`
- Залогинься
- Проверь, что все страницы открываются

### 4. Запусти миграцию из AlfaCRM
- Settings → Миграция → Начать миграцию
- Дождись завершения
- Проверь, что данные появились

---

## 🎯 Итого

✅ **Автоматически при деплое:**
- SQL миграции БД
- Backend + API
- Frontend

✅ **Вручную после деплоя (1 раз):**
- Миграция данных из AlfaCRM через UI

✅ **Готово к работе!** 🎉

---

## 🆘 Support

Если что-то пошло не так:
1. Проверь логи: `railway logs`
2. Проверь Environment Variables
3. Проверь DATABASE_URL
4. Убедись, что Node.js установлен в Docker image

