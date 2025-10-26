@echo off
echo ================================================================
echo   ПОЛНЫЙ СБРОС БД И МИГРАЦИЯ ИЗ ALFACRM
echo ================================================================
echo.

echo [1/4] Остановка backend (если запущен)...
taskkill /F /IM api.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/4] Сброс базы данных...
psql -U postgres -c "DROP DATABASE IF EXISTS classmate_central;"
psql -U postgres -c "CREATE DATABASE classmate_central;"
echo      Готово!
echo.

echo [3/4] Запуск backend (миграции применятся автоматически)...
cd backend
start "Backend" cmd /c "go run cmd/api/main.go"
echo      Ожидание запуска backend...
timeout /t 10 /nobreak >nul
echo.

echo [4/4] Миграция данных из AlfaCRM...
cd ..\migration
node migrate-from-alfacrm.js
echo.

echo ================================================================
echo   ГОТОВО! Проверьте frontend.
echo ================================================================
pause

