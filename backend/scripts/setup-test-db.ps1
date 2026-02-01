# Script to create test database for running tests
# Run this once to set up the test database

param(
    [string]$Host = "localhost",
    [string]$Port = "5432",
    [string]$User = "postgres",
    [string]$Password = "postgres",
    [string]$TestDbName = "classmate_central_test"
)

Write-Host "Setting up test database: $TestDbName"

# Set password in environment for psql
$env:PGPASSWORD = $Password

# Check if database exists
$checkDb = docker exec classmate_central_db psql -U $User -tc "SELECT 1 FROM pg_database WHERE datname = '$TestDbName'" 2>$null

if ($checkDb -match "1") {
    Write-Host "Test database '$TestDbName' already exists"
} else {
    Write-Host "Creating test database '$TestDbName'..."
    docker exec classmate_central_db psql -U $User -c "CREATE DATABASE $TestDbName" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Test database created successfully!"
    } else {
        Write-Host "Failed to create test database. Make sure Docker container is running."
        exit 1
    }
}

Write-Host ""
Write-Host "Test database is ready. You can now run tests with:"
Write-Host "  cd backend"
Write-Host "  go test ./... -v"
Write-Host ""
Write-Host "Tests will use database: $TestDbName"
Write-Host "Your development data in 'classmate_central' will NOT be affected."
