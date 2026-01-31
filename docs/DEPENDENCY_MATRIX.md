# Матрица взаимосвязей - Classmate Central CRM

> Дата создания: 31 января 2026

## 1. Архитектура системы

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │  Pages  │──│Components│──│  Hooks  │──│ Context │            │
│  └────┬────┘  └─────────┘  └────┬────┘  └─────────┘            │
│       │                         │                               │
│       └─────────────────────────┴───────────┐                   │
│                                             ▼                   │
│                                      ┌───────────┐              │
│                                      │  API Layer│              │
│                                      └─────┬─────┘              │
└────────────────────────────────────────────┼────────────────────┘
                                             │ HTTP/REST
┌────────────────────────────────────────────┼────────────────────┐
│                         BACKEND (Go/Gin)   │                    │
│                                      ┌─────▼─────┐              │
│                                      │ Middleware│              │
│                                      └─────┬─────┘              │
│                                      ┌─────▼─────┐              │
│                                      │ Handlers  │              │
│                                      └─────┬─────┘              │
│       ┌────────────────────────────────────┼───────────────┐    │
│       ▼                    ▼               ▼               ▼    │
│  ┌─────────┐        ┌───────────┐   ┌────────────┐  ┌─────────┐│
│  │ Services│        │Repository │   │   Models   │  │ Errors  ││
│  └─────────┘        └─────┬─────┘   └────────────┘  └─────────┘│
└───────────────────────────┼─────────────────────────────────────┘
                            │ SQL
                      ┌─────▼─────┐
                      │ PostgreSQL│
                      └───────────┘
```

---

## 2. Матрица связей сущностей (Entity Relationships)

### 2.1 Основные сущности и их зависимости

| Сущность | Зависит от | Зависящие сущности |
|----------|------------|-------------------|
| **Company** | - | User, Branch, Teacher, Student, Group, Lesson, Room, Lead, Discount, SubscriptionType, Role, Permission, Settings |
| **Branch** | Company | User, Teacher, Student, Group, Lesson, Room, Lead, Discount, Enrollment, DebtRecord, Payment |
| **User** | Company, Branch, Role | UserRole, UserBranch, LeadTask, StudentActivityLog |
| **Teacher** | Company, Branch | Lesson, Group, TeacherRate, IndividualEnrollment |
| **Student** | Company, Branch | Enrollment, Subscription, Payment, Attendance, Debt, Notification, ActivityLog |
| **Group** | Company, Branch, Teacher, Room | Enrollment, Lesson, ScheduleRule, Subscription |
| **Lesson** | Company, Branch, Teacher, Group, Room | LessonAttendance, ScheduleRule, LessonOccurrence |
| **Room** | Company, Branch | Lesson, Group |
| **SubscriptionType** | Company, Branch | StudentSubscription |
| **StudentSubscription** | Student, SubscriptionType, Group, Teacher | SubscriptionFreeze, SubscriptionConsumption, Attendance |
| **Role** | Company | User, Permission, UserRole |
| **Lead** | Company, Branch | LeadActivity, LeadTask |

### 2.2 Визуальная диаграмма связей

```
                              ┌───────────┐
                              │  COMPANY  │
                              └─────┬─────┘
           ┌──────────────────────┬┴┬──────────────────────┐
           ▼                      ▼ ▼                      ▼
     ┌──────────┐           ┌─────────┐            ┌───────────┐
     │  BRANCH  │           │  USER   │            │   ROLE    │
     └────┬─────┘           └────┬────┘            └─────┬─────┘
          │                      │                       │
    ┌─────┼─────┬───────┬───────┐│                      │
    ▼     ▼     ▼       ▼       ▼▼                      ▼
┌──────┐┌─────┐┌────┐┌──────┐┌──────────┐        ┌───────────┐
│TEACHER││ROOM ││LEAD││STUDENT││ USER_ROLE│        │PERMISSION │
└───┬──┘└──┬──┘└────┘└───┬──┘└──────────┘        └───────────┘
    │      │             │
    ▼      ▼             │
┌───────────────┐        │
│     GROUP     │◄───────┤
└───────┬───────┘        │
        │                │
        ▼                ▼
┌───────────────┐  ┌───────────────┐
│    LESSON     │  │  ENROLLMENT   │
└───────┬───────┘  └───────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────┐
│                 LESSON_ATTENDANCE                      │
└───────────────────────┬───────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────┐
│              STUDENT_SUBSCRIPTION                      │
├───────────────────────┬───────────────────────────────┤
│ SubscriptionFreeze    │  SubscriptionConsumption      │
└───────────────────────┴───────────────────────────────┘
```

---

## 3. Матрица связей Frontend

### 3.1 Pages → API Dependencies

| Page | API Modules |
|------|-------------|
| **Dashboard** | dashboard, students, finance, lessons |
| **Students** | students, subscriptions, groups |
| **StudentDetail** | students, subscriptions, finance, lessons |
| **Teachers** | teachers, teacherRates |
| **TeacherDetail** | teachers, teacherRates, lessons |
| **Groups** | groups, students, teachers, rooms |
| **Schedule** | lessons, teachers, rooms, groups |
| **IndividualLessons** | lessons, teachers, students |
| **Finance** | finance, students, discounts |
| **Subscriptions** | subscriptions, students, groups |
| **Leads** | leads |
| **Settings** | settings, branches, export, migration |
| **Roles** | roles, auth |
| **Login/Register** | auth |

### 3.2 Components → Dependencies

| Component | Depends On (Components/Hooks/API) |
|-----------|-----------------------------------|
| **Layout** | AppSidebar, HeaderSearch, NotificationDropdown, BranchSwitcher |
| **AppSidebar** | @/context/AuthContext, @/api/client |
| **Dashboard/*** | StatCard, charts (Recharts), @/api/dashboard |
| **CreateGroupModal** | @/api/groups, @/api/teachers, @/api/rooms |
| **AssignSubscriptionModal** | @/api/subscriptions, @/api/groups |
| **LessonFormModal** | @/api/lessons, @/api/teachers, @/api/rooms |
| **BranchManagement** | @/api/branches |
| **ExportDialog** | @/api/export |
| **ProtectedRoute** | @/context/AuthContext |

### 3.3 Frontend Module Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                         src/                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐      uses       ┌──────────────┐          │
│  │   pages/    │ ───────────────▶│ components/  │          │
│  └──────┬──────┘                 └───────┬──────┘          │
│         │                                │                  │
│         │ uses                           │ uses             │
│         ▼                                ▼                  │
│  ┌─────────────┐      uses       ┌──────────────┐          │
│  │   hooks/    │ ───────────────▶│   context/   │          │
│  └──────┬──────┘                 └───────┬──────┘          │
│         │                                │                  │
│         │ uses                           │ uses             │
│         ▼                                ▼                  │
│  ┌─────────────────────────────────────────────┐           │
│  │                  api/                        │           │
│  │  ┌──────────────────────────────────────┐   │           │
│  │  │              client.ts               │   │           │
│  │  │  (axios instance, interceptors)      │   │           │
│  │  └──────────────────────────────────────┘   │           │
│  └─────────────────────────────────────────────┘           │
│                          │                                  │
│                          │ uses                             │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────┐           │
│  │               types/index.ts                │           │
│  └─────────────────────────────────────────────┘           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Матрица связей Backend

### 4.1 Handler → Repository Dependencies

| Handler | Repository Dependencies |
|---------|------------------------|
| **auth_handler** | user_repository, company_repository, branch_repository, role_repository |
| **branch_handler** | branch_repository |
| **dashboard_handler** | student_repository, payment_repository, lesson_repository, subscription_repository |
| **debt_handler** | debt_repository, student_repository |
| **discount_handler** | discount_repository |
| **export_handler** | student_repository, teacher_repository, group_repository |
| **group_handler** | group_repository, enrollment_repository, student_repository, room_repository |
| **lead_handler** | lead_repository |
| **lesson_handler** | lesson_repository, teacher_repository, room_repository, schedule_rule_repository |
| **payment_handler** | payment_repository, student_repository |
| **role_handler** | role_repository, permission_repository |
| **room_handler** | room_repository |
| **settings_handler** | settings_repository |
| **student_handler** | student_repository, enrollment_repository, subscription_repository, activity_repository |
| **subscription_handler** | subscription_repository, student_repository |
| **tariff_handler** | tariff_repository |
| **teacher_handler** | teacher_repository, teacher_rate_repository |
| **teacher_rate_handler** | teacher_rate_repository |

### 4.2 Service → Dependencies

| Service | Dependencies |
|---------|-------------|
| **activity_service** | activity_repository |
| **attendance_service** | lesson_repository, student_repository, subscription_repository |
| **email_service** | SMTP (external) |
| **export_service** | student_repository, teacher_repository, group_repository, PDF/Excel libs |
| **migration_service** | All repositories (data migration) |
| **notification_service** | notification_repository, student_repository, subscription_repository |
| **schedule_generator_service** | schedule_rule_repository, lesson_occurrence_repository |
| **subscription_service** | subscription_repository, subscription_consumption_repository |

### 4.3 Backend Layer Dependency Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     HTTP Request                            │
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                      MIDDLEWARE                              │
│  ┌─────────┐  ┌─────────┐  ┌──────┐  ┌──────┐  ┌─────────┐ │
│  │  CORS   │→ │  Auth   │→ │ RBAC │→ │Logger│→ │RateLimit│ │
│  └─────────┘  └─────────┘  └──────┘  └──────┘  └─────────┘ │
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                       HANDLERS                               │
│  Request Validation → Business Logic Orchestration          │
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                       SERVICES                               │
│  Complex Business Logic, Cross-cutting Concerns              │
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                      REPOSITORY                              │
│  Data Access, SQL Queries, Transactions                      │
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                       DATABASE                               │
│  PostgreSQL (Multi-tenant with company_id isolation)         │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Матрица модулей по функциональности

### 5.1 Core Modules

| Модуль | Frontend | Backend Handler | Backend Repository | Описание |
|--------|----------|-----------------|-------------------|----------|
| **Auth** | Login, Register, VerifyEmail, AcceptInvite | auth_handler | user_repository, company_repository | Аутентификация/регистрация |
| **RBAC** | Roles | role_handler, user_role_handler | role_repository, permission_repository | Управление ролями |
| **Branches** | Settings/BranchManagement | branch_handler | branch_repository | Мультифилиальность |

### 5.2 Educational Modules

| Модуль | Frontend | Backend Handler | Backend Repository | Описание |
|--------|----------|-----------------|-------------------|----------|
| **Teachers** | Teachers, TeacherDetail | teacher_handler, teacher_rate_handler | teacher_repository, teacher_rate_repository | Управление преподавателями |
| **Students** | Students, StudentDetail | student_handler | student_repository, enrollment_repository | Управление учениками |
| **Groups** | Groups | group_handler | group_repository, enrollment_repository | Учебные группы |
| **Schedule** | Schedule, IndividualLessons | lesson_handler | lesson_repository, schedule_rule_repository | Расписание занятий |
| **Rooms** | Settings | room_handler | room_repository | Аудитории |

### 5.3 Finance Modules

| Модуль | Frontend | Backend Handler | Backend Repository | Описание |
|--------|----------|-----------------|-------------------|----------|
| **Payments** | Finance | payment_handler | payment_repository | Платежи |
| **Subscriptions** | Subscriptions | subscription_handler | subscription_repository | Абонементы |
| **Debts** | Finance | debt_handler | debt_repository | Задолженности |
| **Discounts** | Finance | discount_handler | discount_repository | Скидки |

### 5.4 CRM Modules

| Модуль | Frontend | Backend Handler | Backend Repository | Описание |
|--------|----------|-----------------|-------------------|----------|
| **Leads** | Leads | lead_handler | lead_repository | Лиды (потенциальные клиенты) |
| **Dashboard** | Dashboard | dashboard_handler | Multiple repos | Аналитика |

---

## 6. Матрица API Endpoints

### 6.1 REST API Endpoints Map

| Endpoint Group | Methods | Frontend API File | Backend Handler |
|---------------|---------|------------------|-----------------|
| `/api/auth/*` | POST | auth.ts | auth_handler.go |
| `/api/branches/*` | GET, POST, PUT, DELETE | branches.ts | branch_handler.go |
| `/api/teachers/*` | GET, POST, PUT, DELETE | teachers.ts | teacher_handler.go |
| `/api/teacher-rates/*` | GET, POST, PUT, DELETE | teacherRates.ts | teacher_rate_handler.go |
| `/api/students/*` | GET, POST, PUT, DELETE | students.ts | student_handler.go |
| `/api/groups/*` | GET, POST, PUT, DELETE | groups.ts | group_handler.go |
| `/api/lessons/*` | GET, POST, PUT, DELETE | lessons.ts | lesson_handler.go |
| `/api/rooms/*` | GET, POST, PUT, DELETE | rooms.ts | room_handler.go |
| `/api/leads/*` | GET, POST, PUT, DELETE | leads.ts | lead_handler.go |
| `/api/payments/*` | GET, POST, PUT, DELETE | finance.ts | payment_handler.go |
| `/api/subscriptions/*` | GET, POST, PUT, DELETE | subscriptions.ts | subscription_handler.go |
| `/api/subscription-types/*` | GET, POST, PUT, DELETE | subscriptions.ts | subscription_handler.go |
| `/api/discounts/*` | GET, POST, PUT, DELETE | discounts.ts | discount_handler.go |
| `/api/debts/*` | GET, POST, PUT, DELETE | finance.ts | debt_handler.go |
| `/api/roles/*` | GET, POST, PUT, DELETE | roles.ts | role_handler.go |
| `/api/settings/*` | GET, PUT | settings.ts | settings_handler.go |
| `/api/dashboard/*` | GET | dashboard.ts | dashboard_handler.go |
| `/api/export/*` | GET, POST | export.ts | export_handler.go |

---

## 7. Матрица Data Flow

### 7.1 Создание ученика (Student Creation Flow)

```
┌──────────────────────────────────────────────────────────────────┐
│                        USER ACTION                                │
│              Заполняет форму на странице Students                 │
└───────────────────────────────┬──────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│  FRONTEND: Students.tsx                                          │
│  → Валидация формы                                               │
│  → Вызов studentsApi.createStudent(data)                         │
└───────────────────────────────┬──────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│  FRONTEND: api/students.ts                                       │
│  → POST /api/students                                            │
│  → Добавляет auth token через interceptor                        │
└───────────────────────────────┬──────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│  BACKEND: Middleware Chain                                       │
│  CORS → Auth (JWT verify) → Company Context → RBAC Check         │
└───────────────────────────────┬──────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│  BACKEND: student_handler.go                                     │
│  → Парсинг JSON body                                             │
│  → Валидация данных                                              │
│  → Добавление company_id, branch_id из context                   │
└───────────────────────────────┬──────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│  BACKEND: student_repository.go                                  │
│  → INSERT INTO students (...)                                    │
│  → Возврат созданного Student                                    │
└───────────────────────────────┬──────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│  DATABASE: PostgreSQL                                            │
│  → Вставка записи в таблицу students                             │
│  → Триггеры (если есть)                                          │
└───────────────────────────────┬──────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│  RESPONSE FLOW (обратно по цепочке)                              │
│  DB → Repository → Handler → HTTP Response → API → Component     │
└──────────────────────────────────────────────────────────────────┘
```

### 7.2 Отметка посещаемости (Attendance Flow)

```
Lesson Page                        Backend
    │                                 │
    │  markAttendance(lessonId,       │
    │    studentId, status)           │
    ├────────────────────────────────▶│
    │                                 │
    │                          lesson_handler
    │                                 │
    │                          ┌──────┴──────┐
    │                          ▼             ▼
    │                    attendance     subscription
    │                    _service       _service
    │                          │             │
    │                          ▼             ▼
    │                    Create          Decrement
    │                    Attendance      Lessons
    │                    Record          Remaining
    │                          │             │
    │                          └──────┬──────┘
    │                                 │
    │◀────────────────────────────────┤
    │         Response                │
```

---

## 8. Матрица Multi-Tenancy

### 8.1 Изоляция данных по уровням

| Уровень | Ключ изоляции | Применяется к |
|---------|---------------|---------------|
| **Company** | company_id | Все основные сущности |
| **Branch** | branch_id | Teacher, Student, Group, Lesson, Room, Lead, Payment |
| **User** | user_id | Личные настройки, активность |

### 8.2 Middleware Security Chain

```
Request → CORS → Auth (JWT) → Company Extractor → Branch Validator → RBAC → Handler
                    │              │                    │
                    ▼              ▼                    ▼
              Verify Token   Set company_id      Check branch_id
              Extract user   in context          in user_branches
```

---

## 9. Обозначения и легенда

| Символ | Значение |
|--------|----------|
| `→` | Однонаправленная зависимость |
| `◄►` | Двунаправленная зависимость |
| `▼` | Вызов/запрос |
| `─┐` | Соединение/ветвление |
| `*` | Множественная связь (one-to-many) |

---

## 10. Ключевые точки интеграции

1. **Frontend ↔ Backend**: REST API через axios client с JWT authentication
2. **Backend ↔ Database**: Repository pattern с SQL queries
3. **Multi-tenant**: company_id + branch_id в каждом запросе
4. **RBAC**: Permission-based access control через middleware
5. **Real-time**: Notifications через polling (потенциально WebSocket в будущем)

---

*Документ актуален на дату создания. При изменении архитектуры требуется обновление.*
