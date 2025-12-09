#!/bin/bash

# Script to check database connection
# Usage: ./scripts/check-db-connection.sh

DB_NAME="${DB_NAME:-classmate_central}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

echo "Checking connection to database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo ""

# Try to connect
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Connection successful!"
    echo ""
    echo "Checking if tables exist..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\dt" 2>&1 | head -20
    echo ""
    echo "If no tables are shown, you need to run migrations."
else
    echo ""
    echo "❌ Connection failed!"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check if PostgreSQL is running"
    echo "2. Check if database '$DB_NAME' exists"
    echo "3. Verify credentials (DB_USER, DB_PASSWORD)"
    echo "4. Check firewall/network settings"
fi

