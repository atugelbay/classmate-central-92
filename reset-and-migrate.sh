#!/bin/bash

echo "================================================================"
echo "  ПОЛНЫЙ СБРОС БД И МИГРАЦИЯ ИЗ ALFACRM"
echo "================================================================"
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}[1/4] Остановка backend (если запущен)...${NC}"
pkill -f "api" 2>/dev/null || true
sleep 2

echo -e "${YELLOW}[2/4] Сброс базы данных...${NC}"
# Получаем параметры подключения из .env
source migration/.env
export PGPASSWORD=$DB_PASSWORD

psql -h $DB_HOST -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;"
psql -h $DB_HOST -U $DB_USER -c "CREATE DATABASE $DB_NAME;"

echo -e "${GREEN}     Готово!${NC}"
echo ""

echo -e "${YELLOW}[3/4] Запуск backend (миграции применятся автоматически)...${NC}"
cd backend
nohup go run cmd/api/main.go > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "     Backend PID: $BACKEND_PID"
echo "     Ожидание запуска backend..."
sleep 10
echo ""

echo -e "${YELLOW}[4/4] Миграция данных из AlfaCRM...${NC}"
cd ../migration
node migrate-from-alfacrm.js

echo ""
echo "================================================================"
echo -e "  ${GREEN}✅ ГОТОВО! Проверьте frontend.${NC}"
echo "================================================================"
echo ""
echo "Backend PID: $BACKEND_PID (для остановки: kill $BACKEND_PID)"
echo "Логи backend: backend.log"

