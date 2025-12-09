# PowerShell script to setup test database for integration tests
# Usage: .\scripts\setup-test-db.ps1

$DB_NAME = if ($env:DB_NAME) { $env:DB_NAME } else { "classmate_central" }
$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "postgres" }
$DB_HOST = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$DB_PASSWORD = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "postgres" }

Write-Host "Setting up test database: $DB_NAME" -ForegroundColor Green

# Check if psql is available
try {
    $null = Get-Command psql -ErrorAction Stop
} catch {
    Write-Host "Error: psql command not found. Please install PostgreSQL client tools." -ForegroundColor Red
    exit 1
}

# Set PGPASSWORD environment variable
$env:PGPASSWORD = $DB_PASSWORD

# Create test database
Write-Host "Creating test database..." -ForegroundColor Yellow
& psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>$null
& psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Test database created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Run migrations on test database (set DB_NAME=$DB_NAME and start the app)" -ForegroundColor Cyan
    Write-Host "2. Run integration tests: `$env:DB_NAME='$DB_NAME'; make test-integration" -ForegroundColor Cyan
} else {
    Write-Host "Failed to create test database!" -ForegroundColor Red
    exit 1
}

