# API Documentation для мобильного приложения

## OpenAPI спецификация

Полная OpenAPI 3.0 спецификация доступна в файле `openapi.yaml`. 
Её можно использовать для:
- Автоматической генерации клиентов для мобильных приложений
- Интерактивной документации (Swagger UI)
- Валидации запросов и ответов

Для генерации клиентов используйте инструменты:
- [OpenAPI Generator](https://openapi-generator.tech/)
- [Swagger Codegen](https://swagger.io/tools/swagger-codegen/)

Пример генерации клиента для Swift:
```bash
openapi-generator generate -i openapi.yaml -g swift5 -o ./mobile-client
```

Пример генерации клиента для Kotlin:
```bash
openapi-generator generate -i openapi.yaml -g kotlin -o ./mobile-client
```

## Базовый URL
```
http://your-domain.com/api
```

## Аутентификация

Все защищенные endpoints требуют JWT токен в заголовке:
```
Authorization: Bearer <access_token>
```

### Получение токена

**POST** `/api/auth/login`
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Ответ:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Иван Иванов",
    "roles": ["admin"],
    "permissions": ["students:view", "students:create", ...]
  }
}
```

### Обновление токена

**POST** `/api/auth/refresh`
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Получение текущего пользователя

**GET** `/api/auth/me`

**Ответ:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "Иван Иванов",
  "roles": ["admin"],
  "permissions": ["students:view", "students:create", ...]
}
```

---

## Студенты

### Получить список студентов

**GET** `/api/students?page=1&pageSize=20&query=`

**Query параметры:**
- `page` (int, опционально) - номер страницы
- `pageSize` (int, опционально) - размер страницы
- `query` (string, опционально) - поисковый запрос

**Ответ:**
```json
{
  "students": [
    {
      "id": "uuid",
      "name": "Иван Иванов",
      "age": 15,
      "email": "ivan@example.com",
      "phone": "+77001234567",
      "status": "active",
      "subjects": ["Математика", "Физика"],
      "groupIds": ["group-uuid-1"],
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "pageSize": 20
}
```

### Получить студента по ID

**GET** `/api/students/:id`

**Ответ:**
```json
{
  "id": "uuid",
  "name": "Иван Иванов",
  "age": 15,
  "email": "ivan@example.com",
  "phone": "+77001234567",
  "status": "active",
  "subjects": ["Математика", "Физика"],
  "groupIds": ["group-uuid-1"],
  "balance": 5000.00,
  "subscriptions": [...],
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Создать студента

**POST** `/api/students`
```json
{
  "name": "Иван Иванов",
  "age": 15,
  "email": "ivan@example.com",
  "phone": "+77001234567",
  "subjects": ["Математика", "Физика"]
}
```

### Обновить студента

**PUT** `/api/students/:id`
```json
{
  "name": "Иван Иванов",
  "age": 16,
  "email": "ivan@example.com",
  "phone": "+77001234567"
}
```

### Получить уведомления студента

**GET** `/api/students/:id/notifications`

**Ответ:**
```json
[
  {
    "id": 1,
    "studentId": "uuid",
    "type": "debt_reminder",
    "message": "Просроченный долг: 5000.00 ₸",
    "isRead": false,
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

### Отметить уведомление как прочитанное

**PUT** `/api/notifications/:notificationId/read`

---

## Расписание (Lessons)

### Получить все уроки

**GET** `/api/lessons?startDate=2024-01-01&endDate=2024-01-31`

**Query параметры:**
- `startDate` (string, опционально) - начальная дата (ISO 8601)
- `endDate` (string, опционально) - конечная дата (ISO 8601)

**Ответ:**
```json
[
  {
    "id": "uuid",
    "title": "Математика - Группа А",
    "teacherId": "teacher-uuid",
    "teacherName": "Петр Петров",
    "groupId": "group-uuid",
    "groupName": "Группа А",
    "subject": "Математика",
    "start": "2024-01-01T10:00:00Z",
    "end": "2024-01-01T11:30:00Z",
    "room": "Кабинет 101",
    "roomId": "room-uuid",
    "status": "scheduled",
    "studentIds": ["student-uuid-1", "student-uuid-2"],
    "companyId": "company-uuid"
  }
]
```

### Получить урок по ID

**GET** `/api/lessons/:id`

### Получить индивидуальные уроки

**GET** `/api/lessons/individual?startDate=2024-01-01&endDate=2024-01-31`

### Получить уроки преподавателя

**GET** `/api/lessons/teacher/:teacherId?startDate=2024-01-01&endDate=2024-01-31`

### Создать урок

**POST** `/api/lessons`
```json
{
  "title": "Математика - Группа А",
  "teacherId": "teacher-uuid",
  "groupId": "group-uuid",
  "subject": "Математика",
  "start": "2024-01-01T10:00:00Z",
  "end": "2024-01-01T11:30:00Z",
  "roomId": "room-uuid",
  "studentIds": ["student-uuid-1"]
}
```

### Обновить урок

**PUT** `/api/lessons/:id`
```json
{
  "title": "Математика - Группа А",
  "start": "2024-01-01T10:00:00Z",
  "end": "2024-01-01T11:30:00Z"
}
```

### Удалить урок

**DELETE** `/api/lessons/:id`

---

## Посещаемость (Attendance)

### Отметить посещаемость

**POST** `/api/attendance`
```json
{
  "lessonId": "lesson-uuid",
  "studentId": "student-uuid",
  "status": "attended",
  "reason": null,
  "notes": null
}
```

**Статусы:**
- `attended` - присутствовал
- `missed` - пропустил
- `late` - опоздал

**Причины пропуска (если status = "missed"):**
- `excused` - уважительная причина
- `unexcused` - неуважительная причина
- `sick` - болезнь
- `other` - другое

**Ответ:**
```json
{
  "id": 1,
  "lessonId": "lesson-uuid",
  "studentId": "student-uuid",
  "subscriptionId": "subscription-uuid",
  "status": "attended",
  "reason": null,
  "notes": null,
  "markedBy": 1,
  "markedAt": "2024-01-01T10:00:00Z"
}
```

### Получить посещаемость по уроку

**GET** `/api/attendance/lesson/:lessonId`

**Ответ:**
```json
[
  {
    "id": 1,
    "lessonId": "lesson-uuid",
    "studentId": "student-uuid",
    "status": "attended",
    "markedAt": "2024-01-01T10:00:00Z"
  }
]
```

### Получить посещаемость студента

**GET** `/api/students/:id/attendance?startDate=2024-01-01&endDate=2024-01-31`

---

## Финансы

### Получить все транзакции

**GET** `/api/payments/transactions?page=1&pageSize=20`

**Ответ:**
```json
[
  {
    "id": 1,
    "studentId": "student-uuid",
    "amount": 5000.00,
    "type": "payment",
    "paymentMethod": "cash",
    "description": "Оплата за месяц",
    "createdAt": "2024-01-01T00:00:00Z",
    "createdBy": 1
  }
]
```

**Типы транзакций:**
- `payment` - платеж
- `refund` - возврат
- `debt` - долг

**Способы оплаты:**
- `cash` - наличные
- `card` - банковская карта
- `transfer` - банковский перевод
- `other` - другое

### Создать транзакцию

**POST** `/api/payments/transactions`
```json
{
  "studentId": "student-uuid",
  "amount": 5000.00,
  "type": "payment",
  "paymentMethod": "cash",
  "description": "Оплата за месяц"
}
```

### Получить транзакции студента

**GET** `/api/payments/transactions/student/:studentId`

### Получить баланс студента

**GET** `/api/payments/balance/:studentId`

**Ответ:**
```json
{
  "studentId": "student-uuid",
  "balance": 5000.00
}
```

### Получить все балансы

**GET** `/api/payments/balances`

### Получить долги

**GET** `/api/debts?status=pending`

**Query параметры:**
- `status` (string, опционально) - `pending`, `paid`, `cancelled`

**Ответ:**
```json
[
  {
    "id": 1,
    "studentId": "student-uuid",
    "amount": 5000.00,
    "dueDate": "2024-01-15T00:00:00Z",
    "status": "pending",
    "description": "Долг за декабрь"
  }
]
```

---

## Абонементы (Subscriptions)

### Получить все абонементы

**GET** `/api/subscriptions`

**Ответ:**
```json
[
  {
    "id": "uuid",
    "studentId": "student-uuid",
    "subscriptionTypeId": "type-uuid",
    "totalLessons": 12,
    "usedLessons": 5,
    "remainingLessons": 7,
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-01-31T00:00:00Z",
    "status": "active"
  }
]
```

### Получить абонементы студента

**GET** `/api/subscriptions/student/:studentId`

### Получить абонемент по ID

**GET** `/api/subscriptions/:id`

### Создать абонемент

**POST** `/api/subscriptions`
```json
{
  "studentId": "student-uuid",
  "subscriptionTypeId": "type-uuid",
  "startDate": "2024-01-01T00:00:00Z"
}
```

### Заморозить абонемент

**POST** `/api/subscriptions/:id/freeze`
```json
{
  "startDate": "2024-01-15T00:00:00Z",
  "endDate": "2024-01-20T00:00:00Z",
  "reason": "Болезнь"
}
```

---

## Группы

### Получить все группы

**GET** `/api/groups`

**Ответ:**
```json
[
  {
    "id": "uuid",
    "name": "Группа А",
    "subject": "Математика",
    "teacherId": "teacher-uuid",
    "teacherName": "Петр Петров",
    "studentIds": ["student-uuid-1", "student-uuid-2"],
    "maxStudents": 10,
    "currentStudents": 2,
    "status": "active"
  }
]
```

### Получить группу по ID

**GET** `/api/groups/:id`

---

## Преподаватели

### Получить всех преподавателей

**GET** `/api/teachers`

**Ответ:**
```json
[
  {
    "id": "uuid",
    "name": "Петр Петров",
    "email": "petr@example.com",
    "phone": "+77001234567",
    "subjects": ["Математика", "Физика"],
    "status": "active"
  }
]
```

### Получить преподавателя по ID

**GET** `/api/teachers/:id`

---

## Настройки

### Получить настройки

**GET** `/api/settings`

**Ответ:**
```json
{
  "centerName": "Образовательный Центр",
  "themeColor": "#8B5CF6",
  "timezone": "Asia/Almaty"
}
```

### Обновить настройки

**PUT** `/api/settings`
```json
{
  "centerName": "Образовательный Центр",
  "themeColor": "#8B5CF6",
  "timezone": "Asia/Almaty"
}
```

---

## Дашборд

### Получить статистику

**GET** `/api/dashboard/stats`

**Ответ:**
```json
{
  "students": {
    "total": 100,
    "active": 80,
    "inactive": 20
  },
  "lessons": {
    "total": 500,
    "completed": 450,
    "scheduled": 50
  },
  "finance": {
    "totalRevenue": 1000000.00,
    "pendingDebts": 50000.00
  },
  "attendance": {
    "rate": 85.5,
    "todayPresent": 45,
    "todayAbsent": 5
  }
}
```

---

## Обработка ошибок

Все ошибки возвращаются в следующем формате:

```json
{
  "error": "Описание ошибки"
}
```

**HTTP статус коды:**
- `200` - Успешно
- `201` - Создано
- `400` - Неверный запрос
- `401` - Не авторизован
- `403` - Нет доступа (недостаточно прав)
- `404` - Не найдено
- `500` - Внутренняя ошибка сервера

---

## Пагинация

Для endpoints с пагинацией используется формат:
```
GET /api/endpoint?page=1&pageSize=20
```

**Ответ:**
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "pageSize": 20,
  "totalPages": 5
}
```

---

## Фильтрация и поиск

Многие endpoints поддерживают параметр `query` для поиска:
```
GET /api/students?query=Иван
```

---

## Временные зоны

Все даты и время возвращаются в формате ISO 8601 (UTC):
```
2024-01-01T10:00:00Z
```

Для работы с локальным временем используйте настройки компании (`/api/settings`), поле `timezone`.

---

## Права доступа (RBAC)

Каждый endpoint требует определенных прав доступа. Если у пользователя нет необходимых прав, вернется ошибка `403 Forbidden`.

**Основные права:**
- `students:view` - просмотр студентов
- `students:create` - создание студентов
- `students:update` - обновление студентов
- `students:delete` - удаление студентов
- `lessons:view` - просмотр уроков
- `lessons:create` - создание уроков
- `lessons:update` - обновление уроков
- `lessons:delete` - удаление уроков
- `attendance:mark` - отметка посещаемости
- `attendance:view` - просмотр посещаемости
- `finance:view` - просмотр финансов
- `finance:transactions` - управление транзакциями
- `subscriptions:view` - просмотр абонементов
- `subscriptions:create` - создание абонементов
- `subscriptions:update` - обновление абонементов
- `subscriptions:freeze` - заморозка абонементов

Полный список прав доступен через:
**GET** `/api/permissions`

