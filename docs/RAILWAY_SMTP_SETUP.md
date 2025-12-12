# Настройка Email для Railway

## ⚠️ ВАЖНО: SMTP блокируется на Railway

**Railway блокирует исходящие SMTP соединения** (порты 587 и 465) к большинству провайдеров, включая Gmail, Yandex и Mail.ru. Это приводит к ошибкам "connection timed out" или "i/o timeout".

## ✅ РЕШЕНИЕ: Используйте Resend API (рекомендуется)

**Resend API работает через HTTPS** и не блокируется Railway. Это самый простой и надежный способ отправки email на Railway.

### Быстрая настройка Resend

1. Зарегистрируйтесь на [Resend.com](https://resend.com) (бесплатно до 100 писем/день)
2. Перейдите в **API Keys** и создайте новый ключ
3. На Railway добавьте переменные:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   SMTP_FROM_EMAIL=your-email@yourdomain.com
   ```
   ⚠️ **Важно:** `SMTP_FROM_EMAIL` должен быть верифицированным доменом в Resend (или используйте `onboarding@resend.dev` для тестирования)

4. Перезапустите сервис на Railway

**Готово!** Email будет работать через Resend API.

---

## Альтернатива: SMTP (может не работать на Railway)

Если вы все же хотите попробовать SMTP, настройте переменные:

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

### Ошибка "connection timed out" или "i/o timeout"

Если видите эти ошибки, **Railway блокирует SMTP соединения**. Решения:

1. **✅ Используйте Resend API (рекомендуется):**
   - Работает через HTTPS, не блокируется
   - Бесплатный тариф до 100 писем/день
   - Простая настройка (только 2 переменные)

2. **Попробуйте другой SMTP провайдер:**
   - **SendGrid** (SMTP через порт 587) - иногда работает
   - **Mailgun** - иногда работает
   - ⚠️ Gmail, Yandex, Mail.ru обычно **не работают** на Railway

3. **Если используете SMTP, проверьте:**
   - Пароль вставлен **БЕЗ пробелов**
   - Для Gmail: 2FA включена и используется App Password

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

## Как работает приложение

Приложение автоматически определяет, какой способ отправки использовать:

1. **Если установлен `RESEND_API_KEY`** → использует Resend API (рекомендуется для Railway)
2. **Если настроен SMTP** → использует SMTP (может не работать на Railway)
3. **Если ничего не настроено** → логирует email в консоль (для разработки)

В логах вы увидите:
- `Email service initialized with Resend API` - используется Resend
- `Email service initialized with SMTP` - используется SMTP
- `Email service is not configured` - email логируется в консоль

## Проверка работы

После настройки:

1. Перезапустите сервис на Railway
2. Проверьте логи - должно появиться:
   ```
   Email service initialized with Resend API fromEmail=your-email@domain.com
   ```
   или
   ```
   Email service initialized with SMTP smtpHost=smtp.gmail.com smtpPort=465
   ```
3. Попробуйте зарегистрировать нового пользователя - код должен прийти на email

