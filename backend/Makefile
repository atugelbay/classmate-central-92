.PHONY: test test-report test-coverage test-all install-tools test-pdf report-pdf

# Install test tools
install-tools:
	go install gotest.tools/gotestsum@latest

# Run all tests with verbose output
test:
	go test ./internal/... -v

# Run tests with HTML/JSON reports (sequential to avoid DB conflicts)
test-report:
	-mkdir reports 2>nul
	gotestsum --format testname --jsonfile reports/test-results.json --junitfile reports/test-results.xml -- ./internal/... -v -p 1

# Run tests with coverage report
test-coverage:
	-mkdir reports 2>nul
	go test ./internal/... -coverprofile=reports/coverage.out
	go tool cover -html=reports/coverage.out -o reports/coverage.html

# Run all tests with reports and coverage
test-all: test-report test-coverage
	@echo ""
	@echo "All test reports generated in reports/"

# Run tests and generate PDF report
test-pdf: test-report
	go run ./cmd/testreport reports/test-results.json reports/test-report.pdf
	@echo "PDF report generated: reports/test-report.pdf"

# Generate PDF from existing results (no re-run)
report-pdf:
	go run ./cmd/testreport reports/test-results.json reports/test-report.pdf
	@echo "PDF report generated: reports/test-report.pdf"

# Run specific test package
test-handlers:
	go test ./internal/handlers/... -v

test-services:
	go test ./internal/services/... -v

# Run tests matching pattern
test-attendance:
	go test ./internal/... -v -run "Attendance"

test-payment:
	go test ./internal/... -v -run "Payment"

test-subscription:
	go test ./internal/... -v -run "Subscription"

test-group:
	go test ./internal/... -v -run "Group"

test-license:
	go test ./internal/... -v -run "License"

test-billing:
	go test ./internal/... -v -run "Billing"

test-tariff:
	go test ./internal/repository/... ./internal/handlers/... ./internal/services/... -v -run "License|Billing|Plan"

# Clean reports
clean:
	rm -rf reports/
