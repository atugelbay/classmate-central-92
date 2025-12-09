# PowerShell script to run tests
# Usage: .\test.ps1 [unit|integration|all]

param(
    [string]$Type = "all"
)

Write-Host "Running tests..." -ForegroundColor Green

if ($Type -eq "unit" -or $Type -eq "all") {
    Write-Host "`nRunning unit tests..." -ForegroundColor Yellow
    & go test ./internal/services/... -v
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Unit tests failed!" -ForegroundColor Red
        exit 1
    }
}

if ($Type -eq "integration" -or $Type -eq "all") {
    Write-Host "`nRunning integration tests..." -ForegroundColor Yellow
    Write-Host "Note: Integration tests require test database" -ForegroundColor Cyan
    
    # Check if test DB env vars are set
    if (-not $env:DB_NAME -or $env:DB_NAME -ne "classmate_central_test") {
        Write-Host "Warning: DB_NAME not set to 'classmate_central_test'" -ForegroundColor Yellow
        Write-Host "Set environment variables:" -ForegroundColor Cyan
        Write-Host "  `$env:DB_NAME='classmate_central_test'" -ForegroundColor Cyan
        Write-Host "  `$env:DB_HOST='localhost'" -ForegroundColor Cyan
        Write-Host "  `$env:DB_USER='postgres'" -ForegroundColor Cyan
        Write-Host "  `$env:DB_PASSWORD='postgres'" -ForegroundColor Cyan
    }
    
    & go test ./internal/handlers/... -v
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Integration tests failed!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`nAll tests passed!" -ForegroundColor Green

