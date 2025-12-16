-- ChuckfestAI Seed: Past Trip Attendees
-- Run this in Supabase SQL Editor after running the past_trips seed
-- Links members to the trips they attended

-- 2020: Kings Canyon - Redwood Canyon
-- Attendees: Alex, Brett, Brian H, Brian P, Chris, Dipu, Ian, Jason, Rufus, Ryan
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2020 AND m.name = 'Alex';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2020 AND m.name = 'Brett';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2020 AND m.name = 'Brian H';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2020 AND m.name = 'Brian P';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2020 AND m.name = 'Chris';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2020 AND m.name = 'Dipu';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2020 AND m.name = 'Ian';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2020 AND m.name = 'Jason';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2020 AND m.name = 'Rufus';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2020 AND m.name = 'Ryan';

-- 2021: Mosquito Lakes
-- Attendees: Alex, Brett, Brian H, Chris, Dipu, Ian, Jason
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2021 AND m.name = 'Alex';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2021 AND m.name = 'Brett';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2021 AND m.name = 'Brian H';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2021 AND m.name = 'Chris';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2021 AND m.name = 'Dipu';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2021 AND m.name = 'Ian';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2021 AND m.name = 'Jason';

-- 2022: Dinkey Lakes
-- Attendees: Alex, Brett, Brian H, Chris, Dipu, Eric, Ian, Jason, Kevin, Rufus
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2022 AND m.name = 'Alex';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2022 AND m.name = 'Brett';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2022 AND m.name = 'Brian H';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2022 AND m.name = 'Chris';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2022 AND m.name = 'Dipu';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2022 AND m.name = 'Eric';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2022 AND m.name = 'Ian';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2022 AND m.name = 'Jason';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2022 AND m.name = 'Kevin';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2022 AND m.name = 'Rufus';

-- 2023: Desolation Wilderness
-- Attendees: Alex, Brett, Brian H, Chris, Dipu, Ian, Jason
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2023 AND m.name = 'Alex';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2023 AND m.name = 'Brett';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2023 AND m.name = 'Brian H';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2023 AND m.name = 'Chris';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2023 AND m.name = 'Dipu';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2023 AND m.name = 'Ian';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2023 AND m.name = 'Jason';

-- 2024: Golden Trout Wilderness
-- Attendees: Alex, Brett, Brian H, Chris, Dipu, Ian, Jason, Kevin, Ryan
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2024 AND m.name = 'Alex';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2024 AND m.name = 'Brett';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2024 AND m.name = 'Brian H';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2024 AND m.name = 'Chris';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2024 AND m.name = 'Dipu';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2024 AND m.name = 'Ian';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2024 AND m.name = 'Jason';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2024 AND m.name = 'Kevin';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2024 AND m.name = 'Ryan';

-- 2025: Hoover Wilderness
-- Attendees: Alex, Brett, Chris, Dipu, Eric, Ian, Jason
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2025 AND m.name = 'Alex';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2025 AND m.name = 'Brett';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2025 AND m.name = 'Chris';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2025 AND m.name = 'Dipu';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2025 AND m.name = 'Eric';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2025 AND m.name = 'Ian';
INSERT INTO past_trip_attendees (past_trip_id, member_id)
SELECT pt.id, m.id FROM past_trips pt, members m WHERE pt.year = 2025 AND m.name = 'Jason';
