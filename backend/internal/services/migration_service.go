package services

import (
	"bufio"
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
)

type MigrationService struct {
	scriptPath string
}

func NewMigrationService() *MigrationService {
	// Check if running in Docker (absolute path) or locally (relative path)
	scriptPath := filepath.Join("migration", "migrate-from-alfacrm.js")
	if _, err := os.Stat(scriptPath); os.IsNotExist(err) {
		// Try relative path for local development
		scriptPath = filepath.Join("../migration", "migrate-from-alfacrm.js")
	}
	return &MigrationService{
		scriptPath: scriptPath,
	}
}

type MigrationConfig struct {
	AlfaCRMURL string
	Email      string
	APIKey     string
	CompanyID  string
	DBHost     string
	DBPort     string
	DBName     string
	DBUser     string
	DBPassword string
	ScriptPath string // Путь к скрипту миграции
}

type MigrationResult struct {
	Stdout string
	Stderr string
	Error  error
}

// ProgressCallback is called for each line of stdout from the migration script
type ProgressCallback func(line string)

// RunMigration executes the Node.js migration script
func (s *MigrationService) RunMigration(config MigrationConfig, progressCallback ProgressCallback) (*MigrationResult, error) {
	// Determine script path
	scriptPath := config.ScriptPath
	if scriptPath == "" {
		// Default to the service's script path
		scriptPath = s.scriptPath
	}

	// Check if script exists, try relative path if not
	if _, err := os.Stat(scriptPath); os.IsNotExist(err) {
		// Try relative path for local development
		relativePath := filepath.Join("../", scriptPath)
		if _, err := os.Stat(relativePath); err == nil {
			scriptPath = relativePath
		}
	}

	// Create environment variables for the script
	envVars := []string{
		fmt.Sprintf("ALFACRM_API_URL=%s", config.AlfaCRMURL),
		fmt.Sprintf("ALFACRM_EMAIL=%s", config.Email),
		fmt.Sprintf("ALFACRM_API_KEY=%s", config.APIKey),
		fmt.Sprintf("COMPANY_ID=%s", config.CompanyID),
		fmt.Sprintf("COMPANY_NAME=%s", "Imported from AlfaCRM"),
		fmt.Sprintf("DB_HOST=%s", config.DBHost),
		fmt.Sprintf("DB_PORT=%s", config.DBPort),
		fmt.Sprintf("DB_NAME=%s", config.DBName),
		fmt.Sprintf("DB_USER=%s", config.DBUser),
		fmt.Sprintf("DB_PASSWORD=%s", config.DBPassword),
	}

	// Also pass DATABASE_URL for Railway (Node.js can parse it directly)
	if databaseURL := os.Getenv("DATABASE_URL"); databaseURL != "" {
		envVars = append(envVars, fmt.Sprintf("DATABASE_URL=%s", databaseURL))
	}

	// Also pass Railway PG* variables as fallback
	if pgHost := os.Getenv("PGHOST"); pgHost != "" {
		envVars = append(envVars, fmt.Sprintf("PGHOST=%s", pgHost))
	}
	if pgPort := os.Getenv("PGPORT"); pgPort != "" {
		envVars = append(envVars, fmt.Sprintf("PGPORT=%s", pgPort))
	}
	if pgDatabase := os.Getenv("PGDATABASE"); pgDatabase != "" {
		envVars = append(envVars, fmt.Sprintf("PGDATABASE=%s", pgDatabase))
	}
	if pgUser := os.Getenv("PGUSER"); pgUser != "" {
		envVars = append(envVars, fmt.Sprintf("PGUSER=%s", pgUser))
	}
	if pgPassword := os.Getenv("PGPASSWORD"); pgPassword != "" {
		envVars = append(envVars, fmt.Sprintf("PGPASSWORD=%s", pgPassword))
	}

	// Execute Node.js script
	cmd := exec.Command("node", scriptPath)

	// Append our environment variables to the existing ones
	cmd.Env = append(os.Environ(), envVars...)

	// Get stdout pipe for streaming
	stdoutPipe, err := cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to create stdout pipe: %v", err)
	}

	// Get stderr pipe
	stderrPipe, err := cmd.StderrPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to create stderr pipe: %v", err)
	}

	// Start the command
	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("failed to start migration script: %v", err)
	}

	// Buffers to store all output
	var stdoutBuf, stderrBuf bytes.Buffer

	// Use WaitGroup to wait for both goroutines to finish
	var wg sync.WaitGroup
	wg.Add(2)

	// Read stdout in a goroutine
	go func() {
		defer wg.Done()
		scanner := bufio.NewScanner(stdoutPipe)
		for scanner.Scan() {
			line := scanner.Text()
			// Write to buffer
			stdoutBuf.WriteString(line + "\n")
			// Call callback if provided
			if progressCallback != nil {
				progressCallback(line)
			}
		}
		if err := scanner.Err(); err != nil {
			// Log error but don't fail migration
			fmt.Printf("Error reading stdout: %v\n", err)
		}
	}()

	// Read stderr in a goroutine
	go func() {
		defer wg.Done()
		scanner := bufio.NewScanner(stderrPipe)
		for scanner.Scan() {
			line := scanner.Text()
			stderrBuf.WriteString(line + "\n")
		}
		if err := scanner.Err(); err != nil {
			// Log error but don't fail migration
			fmt.Printf("Error reading stderr: %v\n", err)
		}
	}()

	// Wait for both output streams to finish
	wg.Wait()

	// Wait for command to finish
	err = cmd.Wait()

	result := &MigrationResult{
		Stdout: stdoutBuf.String(),
		Stderr: stderrBuf.String(),
		Error:  err,
	}

	if err != nil {
		return result, fmt.Errorf("migration script failed: %v", err)
	}

	return result, nil
}

// TestConnection tests the connection to AlfaCRM
func (s *MigrationService) TestConnection(url, email, apiKey string) (bool, error) {
	// This would be implemented to test AlfaCRM connection
	return true, nil
}
