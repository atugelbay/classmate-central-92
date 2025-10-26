package services

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
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
}

type MigrationResult struct {
	Stdout string
	Stderr string
	Error  error
}

// RunMigration executes the Node.js migration script
func (s *MigrationService) RunMigration(config MigrationConfig) (*MigrationResult, error) {
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

	// Execute Node.js script
	cmd := exec.Command("node", s.scriptPath)

	// Append our environment variables to the existing ones
	cmd.Env = append(os.Environ(), envVars...)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()

	result := &MigrationResult{
		Stdout: stdout.String(),
		Stderr: stderr.String(),
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
