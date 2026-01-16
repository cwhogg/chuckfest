-- Add national_forest column to sites table
ALTER TABLE sites ADD COLUMN IF NOT EXISTS national_forest TEXT;

-- Create index for filtering by national forest
CREATE INDEX IF NOT EXISTS idx_sites_national_forest ON sites(national_forest);
