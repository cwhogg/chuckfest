-- ChuckfestAI Initial Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- MEMBERS
-- ============================================
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- SITES
-- ============================================
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  region TEXT,
  description TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  permit_url TEXT,
  difficulty TEXT,
  distance_miles DECIMAL,
  elevation_gain_ft INTEGER,
  peak_elevation_ft INTEGER,
  photos TEXT[],
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  -- Permit rule fields
  permit_type TEXT,
  permit_advance_days INTEGER,
  permit_open_time TEXT DEFAULT '07:00',
  permit_fixed_open_date TEXT,
  permit_lottery_open TEXT,
  permit_lottery_close TEXT,
  permit_lottery_results TEXT,
  permit_cost DECIMAL,
  permit_notes TEXT
);

-- ============================================
-- VOTES
-- ============================================
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (member_id, site_id)
);

-- ============================================
-- COMMENTS
-- ============================================
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TRIP_YEARS
-- ============================================
CREATE TABLE trip_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL UNIQUE,
  status TEXT DEFAULT 'planning',
  date_voting_opens DATE,
  date_voting_deadline DATE,
  final_start_date DATE,
  final_end_date DATE,
  final_site_id UUID REFERENCES sites(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- DATE_OPTIONS
-- ============================================
CREATE TABLE date_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_year_id UUID NOT NULL REFERENCES trip_years(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  label TEXT
);

-- ============================================
-- DATE_AVAILABILITY
-- ============================================
CREATE TABLE date_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  date_option_id UUID NOT NULL REFERENCES date_options(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (member_id, date_option_id)
);

-- ============================================
-- PAST_TRIPS
-- ============================================
CREATE TABLE past_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  start_date DATE,
  end_date DATE,
  site_id UUID REFERENCES sites(id),
  location_name TEXT,
  hike_miles DECIMAL,
  elevation_gain_ft INTEGER,
  campsite_elevation_ft INTEGER,
  album_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PAST_TRIP_ATTENDEES
-- ============================================
CREATE TABLE past_trip_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  past_trip_id UUID NOT NULL REFERENCES past_trips(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  UNIQUE (past_trip_id, member_id)
);

-- ============================================
-- PERMIT_REMINDERS
-- ============================================
CREATE TABLE permit_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_year_id UUID NOT NULL REFERENCES trip_years(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  target_trip_date DATE NOT NULL,
  permit_open_datetime TIMESTAMPTZ NOT NULL,
  reminder_datetime TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- REMINDERS_LOG
-- ============================================
CREATE TABLE reminders_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_type TEXT NOT NULL,
  reference_id UUID,
  sent_at TIMESTAMPTZ DEFAULT now(),
  recipient_count INTEGER,
  email_subject TEXT
);

-- ============================================
-- INDEXES ON FOREIGN KEYS
-- ============================================
CREATE INDEX idx_votes_member_id ON votes(member_id);
CREATE INDEX idx_votes_site_id ON votes(site_id);
CREATE INDEX idx_comments_member_id ON comments(member_id);
CREATE INDEX idx_comments_site_id ON comments(site_id);
CREATE INDEX idx_date_options_trip_year_id ON date_options(trip_year_id);
CREATE INDEX idx_date_availability_member_id ON date_availability(member_id);
CREATE INDEX idx_date_availability_date_option_id ON date_availability(date_option_id);
CREATE INDEX idx_past_trips_site_id ON past_trips(site_id);
CREATE INDEX idx_past_trip_attendees_past_trip_id ON past_trip_attendees(past_trip_id);
CREATE INDEX idx_past_trip_attendees_member_id ON past_trip_attendees(member_id);
CREATE INDEX idx_permit_reminders_trip_year_id ON permit_reminders(trip_year_id);
CREATE INDEX idx_permit_reminders_site_id ON permit_reminders(site_id);
CREATE INDEX idx_trip_years_final_site_id ON trip_years(final_site_id);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE date_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE date_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE past_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE past_trip_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE permit_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PERMISSIVE POLICIES (allow all for now)
-- ============================================

-- Members
CREATE POLICY "Allow all access to members" ON members
  FOR ALL USING (true) WITH CHECK (true);

-- Sites
CREATE POLICY "Allow all access to sites" ON sites
  FOR ALL USING (true) WITH CHECK (true);

-- Votes
CREATE POLICY "Allow all access to votes" ON votes
  FOR ALL USING (true) WITH CHECK (true);

-- Comments
CREATE POLICY "Allow all access to comments" ON comments
  FOR ALL USING (true) WITH CHECK (true);

-- Trip Years
CREATE POLICY "Allow all access to trip_years" ON trip_years
  FOR ALL USING (true) WITH CHECK (true);

-- Date Options
CREATE POLICY "Allow all access to date_options" ON date_options
  FOR ALL USING (true) WITH CHECK (true);

-- Date Availability
CREATE POLICY "Allow all access to date_availability" ON date_availability
  FOR ALL USING (true) WITH CHECK (true);

-- Past Trips
CREATE POLICY "Allow all access to past_trips" ON past_trips
  FOR ALL USING (true) WITH CHECK (true);

-- Past Trip Attendees
CREATE POLICY "Allow all access to past_trip_attendees" ON past_trip_attendees
  FOR ALL USING (true) WITH CHECK (true);

-- Permit Reminders
CREATE POLICY "Allow all access to permit_reminders" ON permit_reminders
  FOR ALL USING (true) WITH CHECK (true);

-- Reminders Log
CREATE POLICY "Allow all access to reminders_log" ON reminders_log
  FOR ALL USING (true) WITH CHECK (true);
