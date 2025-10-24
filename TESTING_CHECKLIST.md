# Testing Checklist

## Pre-Testing Setup

### 1. Verify Files Created
```bash
# Check backend structure
ls -la backend/cmd/api/main.go
ls -la backend/internal/handlers/
ls -la backend/internal/repository/
ls -la backend/migrations/

# Check frontend structure
ls -la frontend/src/api/
ls -la frontend/src/pages/Login.tsx
ls -la frontend/src/context/AuthContext.tsx
```

### 2. Environment Setup
```bash
# Backend
cd backend
cat .env  # Verify all variables are set

# Frontend
cd frontend
cat .env  # Verify VITE_API_URL is set
```

## Backend Testing

### 1. Database Connection
```bash
cd backend
docker-compose up -d
docker-compose ps  # Should show postgres as "Up"
```

### 2. Backend Startup
```bash
cd backend
go run cmd/api/main.go
```

**Expected Output:**
```
Successfully connected to database
Migrations executed successfully
Server starting on port 8080
```

### 3. Health Check
```bash
curl http://localhost:8080/health
```

**Expected:** `{"status":"ok"}`

### 4. Test Registration
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Expected:** JSON with `token`, `refreshToken`, and `user` data

### 5. Test Login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Expected:** JSON with `token`, `refreshToken`, and `user` data

## Frontend Testing

### 1. Install Dependencies
```bash
cd frontend
npm install
```

**Expected:** No errors

### 2. Start Frontend
```bash
npm run dev
```

**Expected:** 
```
VITE ready in XXX ms
➜  Local:   http://localhost:5173/
```

### 3. Browser Tests

#### Authentication Flow
- [ ] Navigate to `http://localhost:5173`
- [ ] Should redirect to `/login`
- [ ] Click "Зарегистрироваться"
- [ ] Fill registration form:
  - Name: "Admin User"
  - Email: "admin@example.com"
  - Password: "admin123"
  - Confirm Password: "admin123"
- [ ] Click "Зарегистрироваться"
- [ ] Should redirect to `/` (Dashboard)
- [ ] Should see sidebar with user name and email at bottom

#### Teachers Management
- [ ] Navigate to "Учителя"
- [ ] Click "Добавить учителя"
- [ ] Fill form:
  - ФИО: "Иван Петров"
  - Предмет: "Математика"
  - Email: "ivan@example.com"
  - Телефон: "+7 999 123-45-67"
  - Статус: "Активный"
  - Загруженность: "15"
- [ ] Click "Добавить"
- [ ] Should see new teacher in list
- [ ] Click "Изменить" on teacher
- [ ] Change name to "Иван Петрович"
- [ ] Click "Сохранить"
- [ ] Should see updated name
- [ ] Click trash icon
- [ ] Confirm deletion
- [ ] Teacher should be removed

#### Students Management
- [ ] Navigate to "Ученики"
- [ ] Click "Добавить ученика"
- [ ] Fill form:
  - ФИО: "Анна Королева"
  - Возраст: "16"
  - Email: "anna@example.com"
  - Телефон: "+7 999 111-22-33"
  - Предметы: "Математика, Физика"
- [ ] Click "Добавить"
- [ ] Should see new student
- [ ] Test edit and delete (similar to teachers)

#### Groups Management
- [ ] First, add at least one teacher
- [ ] Navigate to "Группы"
- [ ] Click "Создать группу"
- [ ] Fill form:
  - Название: "Математика 10 класс"
  - Предмет: "Математика"
  - Преподаватель: (select from list)
  - Расписание: "Пн, Ср, Пт 10:00-11:30"
- [ ] Click "Создать"
- [ ] Should see new group
- [ ] Test edit and delete

#### Schedule Management
- [ ] Ensure you have at least one teacher and group
- [ ] Navigate to "Расписание"
- [ ] Click "Добавить урок"
- [ ] Fill form:
  - Название: "Математика - Алгебра"
  - Предмет: "Математика"
  - Преподаватель: (select)
  - Группа: (select)
  - Дата: (today's date)
  - Время начала: "10:00"
  - Время окончания: "11:30"
  - Аудитория: "101"
- [ ] Click "Создать урок"
- [ ] Should see lesson in calendar

#### Dashboard
- [ ] Navigate to "Dashboard"
- [ ] Should see statistics cards with counts
- [ ] Should see calendar with lessons
- [ ] Should see "Ближайшие уроки" list

#### Settings
- [ ] Navigate to "Настройки"
- [ ] Change "Название учебного центра" to "Мой Центр"
- [ ] Change theme color
- [ ] Click "Сохранить настройки"
- [ ] Should see success message
- [ ] Check sidebar - should show new center name

#### Logout
- [ ] Click "Выйти" in sidebar
- [ ] Should redirect to `/login`
- [ ] Try to navigate to `/` manually
- [ ] Should redirect back to `/login`

### 4. Console Tests

Open browser DevTools Console and check:
- [ ] No red errors
- [ ] All API requests return 2xx status codes
- [ ] JWT token is present in localStorage (`localStorage.getItem('token')`)

## Database Verification

### Check Data Persistence
```bash
# Connect to database
docker exec -it classmate_central_db psql -U postgres -d classmate_central

# Check tables
\dt

# Check users
SELECT * FROM users;

# Check teachers
SELECT * FROM teachers;

# Check students
SELECT * FROM students;

# Check groups
SELECT * FROM groups;

# Check lessons
SELECT * FROM lessons;

# Check settings
SELECT * FROM settings;

# Exit
\q
```

## Performance Tests

### Check Response Times
- [ ] Teacher list loads in < 500ms
- [ ] Dashboard loads in < 1s
- [ ] Calendar renders smoothly
- [ ] No lag when switching pages

### Check Data Refresh
- [ ] Open app in two browser tabs
- [ ] Add teacher in tab 1
- [ ] Refresh tab 2
- [ ] Should see new teacher

## Error Handling Tests

### Network Errors
- [ ] Stop backend server
- [ ] Try to add a teacher in frontend
- [ ] Should see error toast
- [ ] Start backend server
- [ ] Try again - should work

### Validation Errors
- [ ] Try to register with invalid email
- [ ] Should see error
- [ ] Try to register with password < 6 chars
- [ ] Should see error

### Token Expiration
- [ ] Wait 24+ hours (or manually delete token from localStorage)
- [ ] Try to navigate
- [ ] Should redirect to login

## Success Criteria

✅ All checkboxes above are checked
✅ No console errors
✅ All CRUD operations work
✅ Authentication flow works
✅ Data persists after refresh
✅ Protected routes work correctly

## Common Issues & Solutions

### Backend won't start
- Check PostgreSQL is running: `docker-compose ps`
- Check port 8080 is free: `lsof -i :8080`
- Check .env file exists and has correct values

### Frontend can't connect to API
- Check backend is running on port 8080
- Check .env has `VITE_API_URL=http://localhost:8080/api`
- Restart frontend after changing .env

### CORS errors
- Check FRONTEND_URL in backend/.env matches frontend URL
- Check CORS middleware is enabled

### "Invalid token" errors
- Clear localStorage and re-login
- Check JWT_SECRET in backend/.env

