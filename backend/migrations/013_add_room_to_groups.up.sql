-- Add room_id column to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS room_id VARCHAR(255);

-- Add foreign key constraint if not exists
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_groups_room'
    ) THEN
        ALTER TABLE groups ADD CONSTRAINT fk_groups_room 
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_groups_room ON groups(room_id);

