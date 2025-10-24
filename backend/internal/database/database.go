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
		connStr = fmt.Sprintf(
			"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
			os.Getenv("DB_HOST"),
			os.Getenv("DB_PORT"),
			os.Getenv("DB_USER"),
			os.Getenv("DB_PASSWORD"),
			os.Getenv("DB_NAME"),
			os.Getenv("DB_SSLMODE"),
		)
	}

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("error opening database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("error connecting to database: %w", err)
	}

	log.Println("Successfully connected to database")

	return &Database{DB: db}, nil
}

func (d *Database) Close() error {
	return d.DB.Close()
}

func (d *Database) RunMigrations() error {
	// List of migration files in order
	migrations := []string{
		"migrations/001_init_schema.up.sql",
		"migrations/002_leads_and_rooms.up.sql",
		"migrations/003_finance.up.sql",
		"migrations/004_subscriptions.up.sql",
	}

	for _, migrationFile := range migrations {
		// Check if file exists
		if _, err := os.Stat(migrationFile); os.IsNotExist(err) {
			log.Printf("Migration file %s not found, skipping", migrationFile)
			continue
		}

		// Read migration file
		migrationSQL, err := os.ReadFile(migrationFile)
		if err != nil {
			return fmt.Errorf("error reading migration file %s: %w", migrationFile, err)
		}

		// Execute migration
		_, err = d.DB.Exec(string(migrationSQL))
		if err != nil {
			return fmt.Errorf("error executing migration %s: %w", migrationFile, err)
		}

		log.Printf("Migration %s executed successfully", migrationFile)
	}

	log.Println("All migrations executed successfully")
	return nil
}
