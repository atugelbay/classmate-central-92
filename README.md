# Classmate Central

Полнофункциональная CRM система для управления образовательным центром.

## Возможности

- 🔐 **Аутентификация** - JWT-based авторизация с автообновлением токенов
- 👨‍🏫 **Управление учителями** - CRUD операции, статусы, загруженность
- 👨‍🎓 **Управление учениками** - CRUD операции, предметы, группы
- 👥 **Группы** - Создание и управление учебными группами
- 📅 **Расписание** - Интерактивный календарь занятий
- ⚙️ **Настройки** - Настройка центра, темы оформления

## Tech Stack

### Backend
- **Go** 1.21+
- **Gin** - Web framework
- **PostgreSQL** - База данных
- **JWT** - Аутентификация

### Frontend
- **React** + **TypeScript**
- **Vite** - Build tool
- **React Query** - Server state
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components

## Быстрый старт

### 1. Backend Setup

```bash
cd backend

# Запустить PostgreSQL через Docker
docker-compose up -d

# Создать .env файл
cp .env.example .env

# Установить зависимости (автоматически при go run)
go mod download

# Запустить сервер
go run cmd/api/main.go
```

Backend будет доступен на `http://localhost:8080`

### 2. Frontend Setup

```bash
cd frontend

# Установить зависимости
npm install

# Создать .env файл
echo "VITE_API_URL=http://localhost:8080/api" > .env

# Запустить dev сервер
npm run dev
```

Frontend будет доступен на `http://localhost:5173`

### 3. Первый вход

1. Откройте `http://localhost:5173`
2. Нажмите "Зарегистрироваться"
3. Создайте первый аккаунт
4. Войдите в систему

## Структура проекта

```
classmate-central-92/
├── backend/              # Go API
│   ├── cmd/api/         # Main application
│   ├── internal/
│   │   ├── models/      # Data models
│   │   ├── handlers/    # HTTP handlers
│   │   ├── repository/  # Database layer
│   │   ├── middleware/  # Auth, CORS
│   │   └── database/    # DB connection
│   ├── migrations/      # SQL migrations
│   └── docker-compose.yml
│
└── frontend/            # React application
    ├── src/
    │   ├── api/        # API clients
    │   ├── components/ # React components
    │   ├── pages/      # Application pages
    │   ├── hooks/      # Custom hooks
    │   └── context/    # Auth context
    └── public/
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `POST /api/auth/refresh` - Обновление токена
- `GET /api/auth/me` - Текущий пользователь

### Protected Endpoints (требуют JWT)
- `GET/POST/PUT/DELETE /api/teachers` - Учителя
- `GET/POST/PUT/DELETE /api/students` - Ученики
- `GET/POST/PUT/DELETE /api/groups` - Группы
- `GET/POST/PUT/DELETE /api/lessons` - Уроки
- `GET/PUT /api/settings` - Настройки

## Environment Variables

### Backend (.env)
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=classmate_central
DB_SSLMODE=disable

JWT_SECRET=your-secret-key
JWT_EXPIRATION=24h
JWT_REFRESH_EXPIRATION=168h

SERVER_PORT=8080
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8080/api
```

## Development

### Backend
```bash
cd backend
go run cmd/api/main.go
```

### Frontend
```bash
cd frontend
npm run dev
```

### Database
```bash
cd backend
docker-compose up -d     # Запустить
docker-compose down      # Остановить
docker-compose logs -f   # Логи
```

## Production Build

### Backend
```bash
cd backend
go build -o bin/api cmd/api/main.go
./bin/api
```

### Frontend
```bash
cd frontend
npm run build
# Файлы в dist/ готовы к деплою
```

## Troubleshooting

### Backend не подключается к БД
- Проверьте что PostgreSQL запущен: `docker-compose ps`
- Проверьте настройки в `.env`
- Проверьте логи: `docker-compose logs postgres`

### Frontend не может подключиться к API
- Убедитесь что backend запущен на порту 8080
- Проверьте `VITE_API_URL` в `.env`
- Проверьте CORS настройки в backend

### Ошибка "Invalid token"
- Очистите localStorage в браузере
- Заново войдите в систему

## Contributing

1. Fork репозиторий
2. Создайте feature branch
3. Commit изменения
4. Push в branch
5. Создайте Pull Request

## License

MIT License

