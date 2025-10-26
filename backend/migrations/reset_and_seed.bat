@echo off
REM Script to reset database and load seed data (Windows version)
REM Usage: reset_and_seed.bat [russian|english]

setlocal

REM Default database connection
if "%DB_HOST%"=="" set DB_HOST=localhost
if "%DB_PORT%"=="" set DB_PORT=5432
if "%DB_USER%"=="" set DB_USER=postgres
if "%DB_NAME%"=="" set DB_NAME=classmate_central
if "%DB_PASSWORD%"=="" set DB_PASSWORD=postgres

REM Set password environment variable
set PGPASSWORD=%DB_PASSWORD%

echo === Classmate Central Database Reset ===
echo.

REM Check which seed data to use
set SEED_FILE=seed_data.sql
if "%1"=="english" (
    set SEED_FILE=seed_test_data.sql
    echo [32mUsing English test data[0m
) else (
    echo [32mUsing Russian production data[0m
)

REM Confirm action
echo [31mWARNING: This will DELETE ALL DATA in the database![0m
set /p confirm="Are you sure you want to continue? (yes/no): "

if not "%confirm%"=="yes" (
    echo [33mAborted.[0m
    exit /b 0
)

echo.
echo [33mStep 1: Clearing existing data...[0m
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f reload_seed_data.sql

echo.
echo [33mStep 2: Loading seed data from %SEED_FILE%...[0m
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f %SEED_FILE%

echo.
echo [33mStep 3: Verifying data...[0m
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f verify_data.sql

echo.
echo [32m=== Database reset complete! ===[0m
echo.
echo You can now test the application with fresh data:
echo   - 8 Students with various scenarios
echo   - 8 Subscriptions (active, expired, frozen)
echo   - 12 Payment transactions
echo   - 11 Attendance records
echo   - Complete activity logs and notifications
echo.
echo See SEED_DATA_GUIDE.md for detailed testing scenarios.

endlocal

