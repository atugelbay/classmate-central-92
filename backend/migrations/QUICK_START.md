# Quick Start - Seed Data

## TL;DR

**On Windows:**
```bash
cd backend/migrations
reset_and_seed.bat
```

**On Linux/Mac:**
```bash
cd backend/migrations
chmod +x reset_and_seed.sh  # First time only
./reset_and_seed.sh
```

## What This Does

1. ✅ Clears all existing data (safely, with confirmation)
2. ✅ Loads fresh mock data
3. ✅ Verifies data loaded correctly
4. ✅ Shows summary statistics

## Choose Your Language

### Russian Data (Default)
```bash
./reset_and_seed.sh
# or
reset_and_seed.bat
```

### English Test Data
```bash
./reset_and_seed.sh english
# or
reset_and_seed.bat english
```

## What You Get

### 8 Students Ready for Testing

| Student | Status | Subscription | Balance | Use Case |
|---------|--------|--------------|---------|----------|
| student-1 | ✅ Active | 5 lessons left | +8,000 | Happy path testing |
| student-2 | ✅ Active | 10 lessons left | +5,000 | Regular student |
| student-3 | ✅ Active | 8 lessons (new) | 0 | New student |
| student-4 | ✅ Active | 14 lessons left | +3,000 | Has pending debt |
| student-5 | ⚠️ Active | 2 lessons left | -10,000 | Expiring subscription |
| student-6 | ❌ Inactive | Expired | -2,000 | Problem student |
| student-7 | ❄️ Frozen | 6 lessons (frozen) | +10,000 | Frozen subscription |
| student-8 | ✅ Active | 7 lessons left | +2,000 | Regular student |

### Complete Test Data

- ✅ 8 Payment Transactions
- ✅ 11 Attendance Records (attended, missed, cancelled)
- ✅ 3 Debt Records (pending, overdue)
- ✅ 8 Student Notes
- ✅ 7 Notifications (read/unread)
- ✅ ~21 Activity Log Entries
- ✅ 10 Lessons (scheduled this week)
- ✅ 8 Leads
- ✅ 5 Teachers
- ✅ 5 Groups
- ✅ 5 Rooms

## Environment Variables

Customize database connection:

**Windows:**
```bat
set DB_HOST=localhost
set DB_PORT=5432
set DB_USER=postgres
set DB_NAME=classmate_central
set DB_PASSWORD=postgres
reset_and_seed.bat
```

**Linux/Mac:**
```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=postgres
export DB_NAME=classmate_central
export DB_PASSWORD=postgres
./reset_and_seed.sh
```

## Manual Steps (If Scripts Don't Work)

```bash
# 1. Connect to database
psql -U postgres -d classmate_central

# 2. Clear data
\i reload_seed_data.sql

# 3. Load seed data
\i seed_data.sql
# OR for English:
# \i seed_test_data.sql

# 4. Verify
\i verify_data.sql

# 5. Exit
\q
```

## Docker Users

```bash
# From project root
docker-compose exec postgres psql -U postgres -d classmate_central

# Then follow manual steps above
```

## Testing Scenarios

### Test Attendance Marking (student-1)
1. Go to `/schedule`
2. Click on any lesson with students
3. Mark attendance for students
4. Check activity log updates

### Test Debt Management (student-5 or student-6)
1. Go to `/students`
2. Click on student with debt
3. View Finance tab
4. See debt records and notifications
5. Add payment to clear debt

### Test Subscription Expiry (student-5)
1. Go to `/students/student-5`
2. View Subscriptions tab
3. See "2 lessons remaining" warning
4. Check notifications for expiry warning

### Test Frozen Subscription (student-7)
1. Go to `/students/student-7`
2. View Subscriptions tab
3. See frozen status
4. Check notes for freeze reason

### Test Complete History (student-1)
1. Go to `/students/student-1`
2. View History tab
3. See complete timeline:
   - Payments
   - Subscription changes
   - Attendance records
   - Notes added

## Need More Details?

See **SEED_DATA_GUIDE.md** for:
- Complete data structure
- All test scenarios
- Detailed student profiles
- Testing strategies
- Database schema overview

## Troubleshooting

### "psql: command not found"
Install PostgreSQL or add it to PATH:
- Windows: Add `C:\Program Files\PostgreSQL\XX\bin` to PATH
- Linux: `sudo apt install postgresql-client`
- Mac: `brew install postgresql`

### Permission denied on .sh file
```bash
chmod +x reset_and_seed.sh
```

### "Database does not exist"
First create the database:
```bash
createdb -U postgres classmate_central
```

Then run migrations:
```bash
cd backend
migrate -path migrations -database "postgres://postgres:postgres@localhost:5432/classmate_central?sslmode=disable" up
```

### Connection refused
Make sure PostgreSQL is running:
```bash
# Check status
sudo systemctl status postgresql  # Linux
brew services list                 # Mac

# Start if needed
sudo systemctl start postgresql    # Linux
brew services start postgresql     # Mac
```

## Best Practices

1. 🔄 **Reset often during development** - Fresh data = consistent testing
2. 📝 **Use English data for screenshots** - Better for documentation
3. 🧪 **Test all scenarios** - Use different students for different features
4. 🔍 **Run verify queries** - Ensure data integrity after testing
5. 💾 **Backup before experiments** - Use `pg_dump` for safety

## Next Steps

1. ✅ Run the seed script
2. ✅ Start the backend: `cd backend && go run cmd/api/main.go`
3. ✅ Start the frontend: `cd frontend && npm run dev`
4. ✅ Login with default credentials
5. ✅ Test all features with the loaded data!

Happy testing! 🚀

