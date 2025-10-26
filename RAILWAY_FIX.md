# 🔧 Исправление Railway Build

## Проблема
Railway использует `backend/Dockerfile` вместо корневого `Dockerfile`.

## ✅ Решение (2 варианта)

### Вариант 1: Через Railway Dashboard (РЕКОМЕНДУЕТСЯ)

1. Открой Railway Dashboard → твой проект
2. Settings → "Dockerfile Path"
3. Измени на: `Dockerfile` (без backend/)
4. Нажми "Deploy" для пересборки

**Screenshot настроек:**
```
Root Directory: /
Dockerfile Path: Dockerfile    ← ВАЖНО: без "backend/"!
```

---

### Вариант 2: Удалить backend/Dockerfile

Если Railway игнорирует `railway.json`, можно временно переименовать:

```bash
# Переименовать backend/Dockerfile
mv backend/Dockerfile backend/Dockerfile.local

# Commit
git add .
git commit -m "fix: use root Dockerfile for Railway"
git push origin main
```

Railway автоматически найдет корневой `Dockerfile`.

---

## 🧪 Проверка

После исправления в логах должно быть:

```
✅ load .dockerignore
✅ COPY backend/ ./           ← Копирует backend из корня
✅ COPY migration/ ./migration/   ← Копирует migration из корня
✅ RUN npm ci --only=production   ← Устанавливает зависимости
✅ Build completed successfully
```

---

## 📋 Что делает корневой Dockerfile

```dockerfile
# 1. Собирает Go приложение из backend/
COPY backend/ ./
RUN go build -o main ./cmd/api

# 2. Копирует migration/ для AlfaCRM
COPY migration/ ./migration/
RUN npm ci --only=production

# 3. Запускает backend с поддержкой миграции
CMD ["./main"]
```

---

## ⚠️ backend/Dockerfile vs Dockerfile

| Файл | Назначение |
|------|------------|
| `backend/Dockerfile` | Локальная разработка (только backend, без миграции) |
| `Dockerfile` (корневой) | **Production** (backend + migration с Node.js) |

**Для Railway используй КОРНЕВОЙ!**

---

## 🆘 Если не работает

```bash
# 1. Проверь railway.json
cat railway.json
# Должно быть: "dockerfilePath": "Dockerfile"

# 2. Проверь, что корневой Dockerfile существует
ls -la Dockerfile

# 3. Форсированный редеплой
railway up --detach
```

---

## ✅ После исправления

Сделай commit:
```bash
git add .
git commit -m "fix: Railway Dockerfile path"
git push origin main
```

Railway автоматически пересоберет с правильным Dockerfile! 🚀

