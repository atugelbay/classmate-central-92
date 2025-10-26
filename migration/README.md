# Миграция данных из AlfaCRM

Скрипты для миграции данных из системы AlfaCRM в Classmate Central.

## Требования

- Node.js 18+
- PostgreSQL
- Доступ к AlfaCRM API

## Установка

```bash
npm install
```

## Конфигурация

Создайте файл `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

Заполните переменные окружения:

```env
# AlfaCRM API
ALFACRM_API_URL=https://ваш-филиал.s20.online
ALFACRM_EMAIL=ваш@email.com
ALFACRM_API_KEY=ваш_api_key

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=classmate_central
DB_USER=postgres
DB_PASSWORD=ваш_пароль
```

## Использование

### Полная миграция

Запустите единый скрипт миграции:

```bash
node migrate-from-alfacrm.js
```

Этот скрипт мигрирует **все данные** в правильном порядке:

1. ✅ Преподаватели (Teachers)
2. ✅ Комнаты (Rooms)
3. ✅ Типы абонементов (Tariffs)
4. ✅ Группы (Groups)
5. ✅ Расписания групп (Group Schedules)
6. ✅ Студенты + балансы (Students + Balances)
7. ✅ Абонементы студентов (Student Subscriptions)
8. ✅ Транзакции (Payment Transactions)
9. ✅ Долги (Debt Records)
10. ✅ Занятия на 2 недели (Lessons)

### Очистка данных

Если нужно удалить все мигрированные данные:

```bash
node cleanup.js
```

⚠️ **ВНИМАНИЕ:** Эта команда удалит **ВСЕ** данные из БД!

## Особенности миграции

### Часовые пояса

Все время из AlfaCRM (Almaty, UTC+5) автоматически конвертируется в UTC для хранения в БД.

Например:
- `10:00 Almaty` → `05:00 UTC`
- `18:00 Almaty` → `13:00 UTC`

Фронтенд автоматически конвертирует обратно в локальное время пользователя.

### Умные абонементы

Абонементы студентов создаются на основе:
- `paid_count` - оплаченных занятий
- `paid_till` - дата окончания абонемента
- `balance` - текущий баланс

Статус абонемента определяется автоматически:
- `active` - если `paid_till` в будущем
- `expired` - если дата истекла или нет оплаченных занятий

### Занятия

Создаются только на **ближайшие 2 недели** на основе расписаний групп. 
Не мигрируется вся история занятий из AlfaCRM.

## Структура данных

```
Teachers → Groups → Group Schedules → Lessons
            ↓
         Students → Student Subscriptions → Student-Group Links
            ↓
    Student Balance → Transactions & Debts
```

## Устранение проблем

### Ошибка подключения к БД

Проверьте:
1. PostgreSQL запущен
2. Правильные данные в `.env`
3. База данных создана: `createdb classmate_central`

### Ошибка 401 от AlfaCRM API

1. Проверьте `ALFACRM_EMAIL` и `ALFACRM_API_KEY`
2. Убедитесь что URL правильный: `https://ваш-филиал.s20.online`

### Дублирование данных

Запустите cleanup и мигрируйте заново:

```bash
node cleanup.js
node migrate-from-alfacrm.js
```

## Несколько пользователей

Если нужно сохранить данные текущего пользователя и создать отдельную БД для нового:

```bash
node backup-and-create-new-db.js
```

Подробнее см. [MULTI_USER_SETUP.md](MULTI_USER_SETUP.md)

## Лицензия

MIT
