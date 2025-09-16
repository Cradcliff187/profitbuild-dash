-- Add sync status columns to vendors table
ALTER TABLE vendors 
ADD COLUMN sync_status sync_status DEFAULT NULL,
ADD COLUMN last_synced_at timestamptz DEFAULT NULL;

-- Add sync status columns to projects table  
ALTER TABLE projects
ADD COLUMN sync_status sync_status DEFAULT NULL,
ADD COLUMN last_synced_at timestamptz DEFAULT NULL;