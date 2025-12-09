#!/bin/bash

# Complete test setup and run script
# This script sets up test DB, runs migrations, and executes all tests

set -e

echo "=== Setting up test environment ==="

# Setup test database
if [ -f "scripts/setup-test-db.sh" ]; then
    echo "Creating test database..."
    ./scripts/setup-test-db.sh
else
    echo "Warning: setup-test-db.sh not found, skipping DB setup"
fi

# Set test DB environment
export DB_NAME=classmate_central
export DB_HOST=${DB_HOST:-localhost}
export DB_PORT=${DB_PORT:-5432}
export DB_USER=${DB_USER:-postgres}
export DB_PASSWORD=${DB_PASSWORD:-postgres}
export DB_SSLMODE=disable
export JWT_SECRET=test-secret

echo ""
echo "=== Running migrations on test database ==="
echo "Note: You may need to run the app once to apply migrations"
echo "      Or apply migrations manually to the test database"

echo ""
echo "=== Running unit tests (no DB required) ==="
go test ./internal/services/... -v

echo ""
echo "=== Running integration tests (requires DB) ==="
go test ./internal/handlers/... -v

echo ""
echo "=== All tests completed ==="

