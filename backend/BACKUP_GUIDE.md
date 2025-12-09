# Database Backup Guide

## Overview

This guide explains how to backup and restore the Classmate Central database.

## Backup Scripts

### Linux/macOS

Use the bash script:

```bash
chmod +x scripts/backup.sh
./scripts/backup.sh [backup_directory]
```

### Windows

Use the PowerShell script:

```powershell
.\scripts\backup.ps1 [backup_directory]
```

## Manual Backup

### Using pg_dump

```bash
pg_dump -h localhost -U postgres -d classmate_central > backup.sql
```

### Using pg_dump with compression

```bash
pg_dump -h localhost -U postgres -d classmate_central | gzip > backup.sql.gz
```

## Restore from Backup

### From SQL file

```bash
psql -h localhost -U postgres -d classmate_central < backup.sql
```

### From compressed backup

```bash
gunzip < backup.sql.gz | psql -h localhost -U postgres -d classmate_central
```

## Automated Backups

### Linux (cron)

Add to crontab for daily backups at 2 AM:

```bash
0 2 * * * /path/to/scripts/backup.sh /path/to/backups
```

### Windows (Task Scheduler)

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger (daily at 2 AM)
4. Action: Start a program
5. Program: `powershell.exe`
6. Arguments: `-File "C:\path\to\scripts\backup.ps1"`

## Backup Retention

- Default retention: 30 days
- Scripts automatically remove backups older than 30 days
- Adjust retention in script if needed

## Best Practices

1. **Regular Backups**: Daily backups recommended
2. **Off-site Storage**: Store backups in a separate location
3. **Test Restores**: Periodically test restore procedures
4. **Encryption**: Encrypt backups if containing sensitive data
5. **Monitoring**: Monitor backup success/failure

## Backup Locations

- Local: `./backups/` (default)
- Cloud: AWS S3, Google Cloud Storage, Azure Blob Storage
- Network: NFS, SMB share

## Troubleshooting

### Permission Denied

Ensure the backup directory is writable:

```bash
chmod 755 backups/
```

### Database Connection Failed

Check database credentials in environment variables:

```bash
echo $DB_HOST
echo $DB_USER
echo $DB_NAME
```

### Insufficient Disk Space

Monitor disk space:

```bash
df -h
```

Clean old backups manually if needed.

