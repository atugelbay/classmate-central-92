# Настройка SMTP для Railway

## Проблема

По умолчанию приложение работает без SMTP (email-уведомления логируются в консоль). Для production на Railway нужно настроить SMTP для отправки:
- Кодов подтверждения email
- Приглашений пользователей
- Уведомлений о платежах
- Уведомлений о пропусках

## Настройка переменных окружения в Railway

1. Откройте ваш проект на Railway
2. Перейдите в **Variables** (Переменные окружения)
3. Добавьте следующие переменные:

### Для Gmail

**⚠️ ВАЖНО:** Railway может блокировать подключение к Gmail на порту 587. Если получаете ошибку "connection timed out", используйте порт **465** (SSL).

**Вариант 1: Порт 465 (SSL) - РЕКОМЕНДУЕТСЯ для Railway:**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password  # БЕЗ пробелов!
SMTP_FROM_EMAIL=your-email@gmail.com
```

**Вариант 2: Порт 587 (STARTTLS) - может не работать на Railway:**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password  # БЕЗ пробелов!
SMTP_FROM_EMAIL=your-email@gmail.com
```

### Для других провайдеров

**Yandex:**
```
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_USER=your-email@yandex.ru
SMTP_PASSWORD=your-password
SMTP_FROM_EMAIL=your-email@yandex.ru
```

**Mail.ru:**
```
SMTP_HOST=smtp.mail.ru
SMTP_PORT=465
SMTP_USER=your-email@mail.ru
SMTP_PASSWORD=your-password
SMTP_FROM_EMAIL=your-email@mail.ru
```

**SendGrid:**
```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM_EMAIL=your-verified-email@domain.com
```

## Получение App Password для Gmail

1. Включите двухфакторную аутентификацию в Google Account
2. Перейдите в [App Passwords](https://myaccount.google.com/apppasswords)
3. Создайте новый App Password для "Mail"
4. Используйте этот пароль в `SMTP_PASSWORD` (не ваш обычный пароль!)

## Проверка настройки

После добавления переменных:

1. Перезапустите сервис на Railway
2. Проверьте логи - должно появиться:
   ```
   Email service initialized smtpHost=smtp.gmail.com smtpPort=465 fromEmail=your-email@gmail.com
   ```
3. Попробуйте зарегистрировать нового пользователя - код должен прийти на email

## Решение проблем

### Ошибка "connection timed out"

Если видите ошибку `dial tcp: connect: connection timed out`:

1. **Попробуйте порт 465 вместо 587:**
   - Измените `SMTP_PORT=587` на `SMTP_PORT=465` на Railway
   - Перезапустите сервис

2. **Если порт 465 тоже не работает, используйте другой провайдер:**
   - **Yandex** (рекомендуется для России/СНГ) - порт 465 работает стабильно
   - **Mail.ru** - порт 465 работает стабильно
   - **SendGrid** - бесплатный тариф до 100 писем/день

3. **Проверьте, что App Password правильный:**
   - Убедитесь, что пароль вставлен **БЕЗ пробелов**
   - Проверьте, что 2FA включена в Google Account

## Если SMTP не настроен

Приложение продолжит работать, но:
- Коды подтверждения будут логироваться в консоль Railway
- Приглашения будут логироваться в консоль
- Уведомления будут логироваться в консоль

Проверить логи можно в разделе **Deployments** → выберите последний деплой → **View Logs**

## Важные замечания

⚠️ **Безопасность:**
- Никогда не коммитьте SMTP пароли в Git
- Используйте App Passwords для Gmail (не основной пароль)
- Регулярно ротируйте пароли

⚠️ **Лимиты:**
- Gmail: до 500 писем в день для бесплатного аккаунта
- Для production лучше использовать SendGrid, Mailgun или AWS SES

## Альтернативные решения

Если не хотите настраивать SMTP, можно:
1. Использовать сервисы типа [Resend](https://resend.com) или [Postmark](https://postmarkapp.com)
2. Настроить webhook для отправки через внешний API
3. Использовать SMS вместо email (требует доработки)

