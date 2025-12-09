# PowerShell script to check database connection
# Usage: .\scripts\check-db-connection.ps1

$DB_NAME = if ($env:DB_NAME) { $env:DB_NAME } else { "classmate_central" }
$DB_HOST = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "postgres" }
$DB_PASSWORD = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "postgres" }

Write-Host "Checking connection to database: $DB_NAME" -ForegroundColor Cyan
Write-Host "Host: ${DB_HOST}:${DB_PORT}" -ForegroundColor Cyan
Write-Host "User: $DB_USER" -ForegroundColor Cyan
Write-Host ""

$env:PGPASSWORD = $DB_PASSWORD

# Try to connect
$result = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT version();" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Connection successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Checking if tables exist..." -ForegroundColor Cyan
    & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\dt" 2>&1 | Select-Object -First 20
    Write-Host ""
    Write-Host "If no tables are shown, you need to run migrations." -ForegroundColor Yellow
} else {
    Write-Host "❌ Connection failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Check if PostgreSQL is running" -ForegroundColor Yellow
    Write-Host "2. Check if database '$DB_NAME' exists" -ForegroundColor Yellow
    Write-Host "3. Verify credentials (DB_USER, DB_PASSWORD)" -ForegroundColor Yellow
    Write-Host "4. Check firewall/network settings" -ForegroundColor Yellow
}

