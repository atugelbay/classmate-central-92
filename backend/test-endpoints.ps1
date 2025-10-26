# Тестируем проблемные endpoints
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJleHAiOjk5OTk5OTk5OTl9.XYZ" # Replace with real token

Write-Host "Testing Tariffs..." -ForegroundColor Yellow
curl -s http://localhost:8080/api/tariffs -H "Authorization: Bearer $token" 2>&1 | Out-String

Write-Host "`nTesting Transactions..." -ForegroundColor Yellow  
curl -s http://localhost:8080/api/payments/transactions -H "Authorization: Bearer $token" 2>&1 | Out-String

Write-Host "`nTesting Debts..." -ForegroundColor Yellow
curl -s http://localhost:8080/api/debts -H "Authorization: Bearer $token" 2>&1 | Out-String

