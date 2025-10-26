# Test /api/teachers endpoint response
Write-Host "🧪 Testing /api/teachers endpoint..." -ForegroundColor Cyan
Write-Host ""

# Get the error response
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/teachers" -Method GET -Headers @{
        "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyLCJleHAiOjE3Mjk5MzU0NTR9.pYvC0mfSZqLqU1cqLABQ_Iz_-M8kxQKJ9S_3WqTBQyE"
    } -SkipHttpErrorCheck
    
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Yellow
    Write-Host "Response:" -ForegroundColor Yellow
    Write-Host $response.Content
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

