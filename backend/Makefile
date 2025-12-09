.PHONY: test test-unit test-integration test-coverage build run

# Run all tests
# Note: Integration tests require database connection
# Set DB_NAME, DB_HOST, DB_USER, DB_PASSWORD if different from defaults
test:
	@echo "Running all tests..."
	@echo "Using DB: ${DB_NAME:-classmate_central}"
	@echo "Note: If using different DB, set DB_NAME env var"
	go test ./... -v

# Run unit tests only
test-unit:
	go test ./internal/services/... -v

# Run integration tests only (requires test database)
test-integration:
	@echo "Note: Integration tests require database 'classmate_central' (or set DB_NAME env var)"
	@echo "Using DB: ${DB_NAME:-classmate_central}"
	go test ./internal/handlers/... -v

# Run tests with coverage
test-coverage:
	go test ./... -coverprofile=coverage.out
	go tool cover -html=coverage.out -o coverage.html

# Build the application
build:
	go build -o bin/api ./cmd/api

# Run the application
run:
	go run ./cmd/api/main.go

# Lint the code
lint:
	golangci-lint run

# Clean build artifacts
clean:
	rm -rf bin/
	rm -f coverage.out coverage.html

