#!/bin/bash

# Script to setup test database for integration tests
# Usage: ./scripts/setup-test-db.sh

set -e

DB_NAME="${DB_NAME:-classmate_central}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

echo "Setting up test database: $DB_NAME"

# Check if PostgreSQL is running
if ! command -v psql &> /dev/null; then
    echo "Error: psql command not found. Please install PostgreSQL client tools."
    exit 1
fi

# Create test database
echo "Creating test database..."
PGPASSWORD="${DB_PASSWORD:-postgres}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true
PGPASSWORD="${DB_PASSWORD:-postgres}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"

echo "Test database created successfully!"

# Run migrations on test database
echo "Running migrations on test database..."
export DB_NAME="$DB_NAME"

# Check if we have a migration runner or need to run SQL files directly
if [ -f "migrations/001_init_schema.up.sql" ]; then
    echo "Note: You may need to run migrations manually or use the application's migration system"
    echo "To run migrations, set DB_NAME=$DB_NAME and start the application"
fi

echo ""
echo "Test database setup complete!"
echo "You can now run integration tests with:"
echo "  DB_NAME=$DB_NAME make test-integration"

