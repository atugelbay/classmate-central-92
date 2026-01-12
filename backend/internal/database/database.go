package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
)

type Database struct {
	DB *sql.DB
}

func NewDatabase() (*Database, error) {
	// Try to use DATABASE_URL first (Railway, Heroku, etc.)
	connStr := os.Getenv("DATABASE_URL")

	// If DATABASE_URL is not set, build connection string from individual env vars
	if connStr == "" {
		// Get env vars with defaults for local development
		dbHost := os.Getenv("DB_HOST")
		dbPort := os.Getenv("DB_PORT")
		dbUser := os.Getenv("DB_USER")
		dbPassword := os.Getenv("DB_PASSWORD")
		dbName := os.Getenv("DB_NAME")
		dbSSLMode := os.Getenv("DB_SSLMODE")

		// Set defaults for local development if not provided
		if dbHost == "" {
			dbHost = "localhost"
		}
		if dbPort == "" {
			dbPort = "5432"
		}
		if dbUser == "" {
			dbUser = "postgres"
		}
		if dbPassword == "" {
			dbPassword = "postgres"
		}
		if dbName == "" {
			dbName = "classmate_central"
		}
		if dbSSLMode == "" {
			dbSSLMode = "disable"
		}

		// Validate required fields
		if dbHost == "" || dbPort == "" || dbUser == "" || dbName == "" {
			return nil, fmt.Errorf(
				"missing required database configuration. Please set either DATABASE_URL or the following environment variables:\n"+
					"  DB_HOST (default: localhost)\n"+
					"  DB_PORT (default: 5432)\n"+
					"  DB_USER (default: postgres)\n"+
					"  DB_PASSWORD (default: postgres)\n"+
					"  DB_NAME (default: classmate_central)\n"+
					"  DB_SSLMODE (default: disable)\n\n"+
					"Current values: DB_HOST=%s, DB_PORT=%s, DB_USER=%s, DB_NAME=%s",
				dbHost, dbPort, dbUser, dbName)
		}

		connStr = fmt.Sprintf(
			"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s connect_timeout=5",
			dbHost, dbPort, dbUser, dbPassword, dbName, dbSSLMode,
		)
	}

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("error opening database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("error connecting to database: %w\n\nPlease check:\n"+
			"  1. PostgreSQL is running\n"+
			"  2. Database connection settings are correct\n"+
			"  3. Database exists: CREATE DATABASE classmate_central;\n"+
			"  4. User has proper permissions", err)
	}

	log.Println("Successfully connected to database")

	return &Database{DB: db}, nil
}

func (d *Database) Close() error {
	return d.DB.Close()
}

func (d *Database) RunMigrations() error {
	log.Println("🔄 Starting database migrations...")

	// Create migrations tracking table if not exists
	_, err := d.DB.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			id SERIAL PRIMARY KEY,
			migration_name VARCHAR(255) UNIQUE NOT NULL,
			applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		return fmt.Errorf("error creating schema_migrations table: %w", err)
	}

	// List of migration files in order
	migrations := []string{
		"migrations/001_init_schema.up.sql",
		"migrations/002_leads_and_rooms.up.sql",
		"migrations/003_finance.up.sql",
		"migrations/004_subscriptions.up.sql",
		"migrations/005_student_enhancements.up.sql",
		"migrations/006_add_multi_tenancy.up.sql",
		"migrations/007_add_company_to_finance.up.sql",
		"migrations/008_fix_missing_columns.up.sql",
		"migrations/009_add_billing_type.up.sql",
		"migrations/010_enhance_subscriptions.up.sql",
		"migrations/011_make_age_nullable.up.sql",
		"migrations/012_add_group_schedule.up.sql",
		"migrations/013_add_room_to_groups.up.sql",
		"migrations/014_add_enrollment.up.sql",
		"migrations/015_add_individual_enrollment.up.sql",
		"migrations/016_add_schedule_rule.up.sql",
		"migrations/017_add_lesson_occurrence.up.sql",
		"migrations/018_add_subscription_consumption.up.sql",
		"migrations/019_add_invoice_tables.up.sql",
		"migrations/020_add_transaction_table.up.sql",
		"migrations/021_add_rbac_system.up.sql",
		"migrations/022_add_company_to_settings.up.sql",
		"migrations/023_add_version_for_optimistic_locking.up.sql",
		"migrations/024_add_timezone_to_settings.up.sql",
		"migrations/025_add_unique_idx_deduction.up.sql",
		"migrations/026_add_email_verification.up.sql",
		"migrations/027_add_branches.up.sql",
		"migrations/028_discounts.up.sql",
		"migrations/029_add_subscription_discount_info.up.sql",
		"migrations/030_add_teacher_salary_fields.up.sql",
		"migrations/031_add_lesson_type.up.sql",
		"migrations/032_create_teacher_rates.up.sql",
	}

	log.Printf("📋 Total migrations to process: %d", len(migrations))

	executedCount := 0
	skippedCount := 0

	for _, migrationFile := range migrations {
		// Check if migration already applied
		var exists bool
		err := d.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE migration_name = $1)", migrationFile).Scan(&exists)
		if err != nil {
			log.Printf("⚠️  Error checking migration status for %s: %v", migrationFile, err)
		}

		if exists {
			log.Printf("⏭️  Migration %s already applied, skipping", migrationFile)
			skippedCount++
			continue
		}

		// Check if file exists
		if _, err := os.Stat(migrationFile); os.IsNotExist(err) {
			log.Printf("⚠️  Migration file %s not found, skipping", migrationFile)
			skippedCount++
			continue
		}

		log.Printf("📄 Processing migration: %s", migrationFile)

		// Read migration file
		migrationSQL, err := os.ReadFile(migrationFile)
		if err != nil {
			return fmt.Errorf("error reading migration file %s: %w", migrationFile, err)
		}

		// Execute migration
		_, err = d.DB.Exec(string(migrationSQL))
		if err != nil {
			log.Printf("❌ Error executing migration %s: %v", migrationFile, err)
			// Continue with other migrations instead of failing completely
			continue
		}

		// Mark migration as applied
		_, err = d.DB.Exec("INSERT INTO schema_migrations (migration_name) VALUES ($1)", migrationFile)
		if err != nil {
			log.Printf("⚠️  Error recording migration %s: %v", migrationFile, err)
		}

		log.Printf("✅ Migration %s executed successfully", migrationFile)
		executedCount++
	}

	log.Printf("🎯 Migrations completed: %d executed, %d skipped", executedCount, skippedCount)

	return nil
}
