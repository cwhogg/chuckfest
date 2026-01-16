-- Add permit_entry_point column to sites table
-- This stores the specific trailhead/entry point name to select when booking permits

ALTER TABLE sites ADD COLUMN IF NOT EXISTS permit_entry_point TEXT;

COMMENT ON COLUMN sites.permit_entry_point IS 'The exact trailhead or entry point name to select in the permit system (e.g., Agnew Meadows, Rush Creek)';
