# Security Guidelines

## Protected Files

Следующие файлы и паттерны автоматически игнорируются Git и **НЕ должны** попадать в репозиторий:

### Environment Variables
- `.env` - все файлы с переменными окружения
- `.env.local`, `.env.development`, `.env.production`, `.env.test`
- Любые файлы с секретами: `*.secret`, `*_secret`, `.secrets/`

### API Keys and Certificates
- `*.key`, `*.pem`, `*.p12`, `*.pfx`, `*.crt`, `*.cert`
- `credentials.json`, `*.credentials`
- `secrets/` директория

### Database Backups
- `*.sql`, `*.dump`, `*.backup` (кроме миграций)
- `backups/` директория
- `*.sql.gz`, `*.sql.zip`

### Docker Secrets
- `docker-compose.override.yml`
- `docker-compose.local.yml`

## Safe Files (в репозитории)

Следующие файлы **безопасны** и должны быть в репозитории:
- `*.env.example` - шаблоны без реальных секретов
- `migrations/*.sql` - файлы миграций (без данных)

## Что делать если случайно закоммитили секреты

1. **Немедленно** смените все закоммиченные секреты:
   - Пароли БД
   - JWT секреты
   - API ключи
   - SMTP пароли

2. Удалите файлы из истории Git:
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch path/to/secret.file" \
     --prune-empty --tag-name-filter cat -- --all
   ```

3. Или используйте `git-filter-repo` (рекомендуется):
   ```bash
   git filter-repo --path path/to/secret.file --invert-paths
   ```

4. Force push (⚠️ предупредите команду):
   ```bash
   git push origin --force --all
   ```

## Best Practices

1. **Никогда** не коммитьте реальные секреты
2. Используйте `.env.example` как шаблон
3. Проверяйте `git status` перед коммитом
4. Используйте секреты через переменные окружения
5. Для production используйте секретные менеджеры (AWS Secrets Manager, HashiCorp Vault и т.д.)

## Проверка перед коммитом

```bash
# Проверить что .env файлы игнорируются
git check-ignore backend/.env frontend/.env

# Проверить что будет закоммичено
git status

# Проверить содержимое коммита
git diff --cached
```

