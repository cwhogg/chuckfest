-- Add permits_obtained field to trip_years
ALTER TABLE trip_years
ADD COLUMN IF NOT EXISTS permits_obtained BOOLEAN DEFAULT false;

-- Create trip_attendance table
CREATE TABLE IF NOT EXISTS trip_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_year_id UUID NOT NULL REFERENCES trip_years(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('in', 'out', 'maybe')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (trip_year_id, member_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trip_attendance_trip_year_id ON trip_attendance(trip_year_id);
CREATE INDEX IF NOT EXISTS idx_trip_attendance_member_id ON trip_attendance(member_id);

-- Enable RLS
ALTER TABLE trip_attendance ENABLE ROW LEVEL SECURITY;

-- Create permissive policy
CREATE POLICY "Allow all access to trip_attendance" ON trip_attendance
  FOR ALL USING (true) WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_trip_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trip_attendance_updated_at ON trip_attendance;
CREATE TRIGGER trip_attendance_updated_at
  BEFORE UPDATE ON trip_attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_attendance_updated_at();
