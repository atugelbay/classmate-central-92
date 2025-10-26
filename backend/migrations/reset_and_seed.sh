#!/bin/bash

# Script to reset database and load seed data
# Usage: ./reset_and_seed.sh [russian|english]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default database connection
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-classmate_central}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

# Export password for psql
export PGPASSWORD="$DB_PASSWORD"

echo -e "${YELLOW}=== Classmate Central Database Reset ===${NC}"
echo ""

# Check which seed data to use
SEED_FILE="seed_data.sql"
if [ "$1" == "english" ]; then
    SEED_FILE="seed_test_data.sql"
    echo -e "${GREEN}Using English test data${NC}"
else
    echo -e "${GREEN}Using Russian production data${NC}"
fi

# Confirm action
echo -e "${RED}WARNING: This will DELETE ALL DATA in the database!${NC}"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${YELLOW}Aborted.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}Step 1: Clearing existing data...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f reload_seed_data.sql

echo ""
echo -e "${YELLOW}Step 2: Loading seed data from $SEED_FILE...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SEED_FILE"

echo ""
echo -e "${YELLOW}Step 3: Verifying data...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f verify_data.sql

echo ""
echo -e "${GREEN}=== Database reset complete! ===${NC}"
echo ""
echo "You can now test the application with fresh data:"
echo "  - 8 Students with various scenarios"
echo "  - 8 Subscriptions (active, expired, frozen)"
echo "  - 12 Payment transactions"
echo "  - 11 Attendance records"
echo "  - Complete activity logs and notifications"
echo ""
echo -e "See ${YELLOW}SEED_DATA_GUIDE.md${NC} for detailed testing scenarios."

