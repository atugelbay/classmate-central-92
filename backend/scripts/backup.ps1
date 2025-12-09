# Database backup script for Classmate Central (Windows PowerShell)
# Usage: .\backup.ps1 [backup_directory]

param(
    [string]$BackupDir = ".\backups"
)

# Configuration
$DB_HOST = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "postgres" }
$DB_NAME = if ($env:DB_NAME) { $env:DB_NAME } else { "classmate_central" }
$DB_PASSWORD = $env:DB_PASSWORD

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "backup_${DB_NAME}_${Timestamp}.sql"

# Create backup directory if it doesn't exist
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

# Set PGPASSWORD environment variable for this session
$env:PGPASSWORD = $DB_PASSWORD

# Perform backup
Write-Host "Starting backup of database: $DB_NAME"
Write-Host "Backup file: $BackupFile"

& pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -F p > $BackupFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backup completed successfully: $BackupFile"
    
    # Compress backup using 7-Zip or PowerShell compression
    $CompressedFile = "${BackupFile}.gz"
    # Note: Requires 7-Zip or similar for compression on Windows
    # For now, just keep uncompressed or use Compress-Archive (creates .zip)
    Compress-Archive -Path $BackupFile -DestinationPath "${BackupFile}.zip" -Force
    Remove-Item $BackupFile
    Write-Host "Backup compressed: ${BackupFile}.zip"
    
    # Remove backups older than 30 days
    Get-ChildItem -Path $BackupDir -Filter "backup_${DB_NAME}_*.sql.*" | 
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | 
        Remove-Item
    
    Write-Host "Old backups cleaned up"
} else {
    Write-Host "Backup failed!"
    exit 1
}

