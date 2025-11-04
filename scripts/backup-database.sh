#!/bin/bash

# Database backup script before major changes
# Usage: ./scripts/backup-database.sh

BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_before_gantt_$TIMESTAMP.sql"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

echo "Creating database backup..."
supabase db dump > $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "✓ Backup created successfully: $BACKUP_FILE"
    echo "File size: $(du -h $BACKUP_FILE | cut -f1)"
else
    echo "✗ Backup failed!"
    exit 1
fi

# Keep only last 10 backups
ls -t $BACKUP_DIR/backup_*.sql | tail -n +11 | xargs -r rm
echo "Cleaned up old backups (keeping last 10)"

