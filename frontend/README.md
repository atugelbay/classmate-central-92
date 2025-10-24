# Classmate Central Frontend

Frontend приложение для системы управления образовательным центром.

## Tech Stack

- **React** + **TypeScript**
- **Vite** - Build tool
- **React Router** - Routing
- **TanStack Query** (React Query) - Server state management
- **Zustand** - Client state management
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Axios** - HTTP client

## Предварительные требования

- Node.js 18+
- npm или yarn
- Backend API запущен на `http://localhost:8080`

## Установка

1. Установите зависимости:
```bash
npm install
```

2. Создайте файл `.env`:
```bash
VITE_API_URL=http://localhost:8080/api
```

3. Запустите dev сервер:
```bash
npm run dev
```

Приложение будет доступно по адресу `http://localhost:5173`

## Доступные скрипты

- `npm run dev` - Запуск development сервера
- `npm run build` - Сборка для production
- `npm run preview` - Просмотр production сборки
- `npm run lint` - Запуск ESLint

## Структура проекта

```
src/
├── api/          # API клиенты и сервисы
├── components/   # React компоненты
│   └── ui/       # shadcn/ui компоненты
├── context/      # React context (Auth)
├── hooks/        # Custom hooks
├── pages/        # Страницы приложения
├── store/        # Zustand store
├── types/        # TypeScript типы
└── lib/          # Утилиты
```

## Основные функции

### Аутентификация
- Регистрация и вход
- JWT токены
- Автоматическое обновление токенов
- Protected routes

### Управление данными
- **Учителя** - CRUD операции
- **Ученики** - CRUD операции
- **Группы** - CRUD операции
- **Уроки** - CRUD операции с календарем
- **Настройки** - Настройка центра

### Особенности
- Автоматическое кеширование с React Query
- Оптимистичные обновления
- Loading states
- Error handling
- Responsive design

## API Интеграция

Все API запросы проходят через централизованный клиент (`src/api/client.ts`):
- Автоматическое добавление JWT токенов
- Обработка ошибок
- Автоматическое обновление токенов

## Развертывание

1. Создайте production сборку:
```bash
npm run build
```

2. Файлы будут в папке `dist/`

3. Разверните на любом статическом хостинге (Vercel, Netlify, etc.)

## Environment Variables

- `VITE_API_URL` - URL бэкенд API (default: `http://localhost:8080/api`)
