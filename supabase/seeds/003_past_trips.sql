-- ChuckfestAI Seed: Past Trips
-- Run this in Supabase SQL Editor after running the sites seed

-- 2020: Kings Canyon - Redwood Canyon (Aug 28-31)
INSERT INTO past_trips (
  year, start_date, end_date,
  site_id, location_name,
  hike_miles, elevation_gain_ft, campsite_elevation_ft,
  album_url, notes
) VALUES (
  2020, '2020-08-28', '2020-08-31',
  (SELECT id FROM sites WHERE name = 'Redwood Canyon'),
  'Kings Canyon - Redwood Canyon',
  3.6, 1078, 6300,
  'https://photos.app.goo.gl/ZEoYDmUhPh6aorQr5',
  'First Chuckfest trip. Giant sequoias and peaceful canyon camping.'
);

-- 2021: Sequoia - Mosquito Lakes (Aug 19-23)
INSERT INTO past_trips (
  year, start_date, end_date,
  site_id, location_name,
  hike_miles, elevation_gain_ft, campsite_elevation_ft,
  album_url, notes
) VALUES (
  2021, '2021-08-19', '2021-08-23',
  (SELECT id FROM sites WHERE name = 'Mosquito Lakes'),
  'Sequoia - Mosquito Lakes (2nd lake)',
  4.0, 2377, 9600,
  'https://photos.app.goo.gl/iWsWwLK3DHcsTSgz7',
  'Mineral King area. Beautiful alpine lakes in classic High Sierra granite.'
);

-- 2022: Dinkey Lakes - Cliff Lake (Jul 14-18)
INSERT INTO past_trips (
  year, start_date, end_date,
  site_id, location_name,
  hike_miles, elevation_gain_ft, campsite_elevation_ft,
  album_url, notes
) VALUES (
  2022, '2022-07-14', '2022-07-18',
  (SELECT id FROM sites WHERE name = 'Cliff Lake'),
  'Dinkey Lakes - Cliff Lake',
  5.1, 1358, 9485,
  'https://photos.app.goo.gl/upJ2nFZchTTaLrpcA',
  'Dinkey Lakes Wilderness. Multiple lakes for day hikes, excellent fishing.'
);

-- 2023: Desolation Wilderness - Lower Velma Lake (Sep 6-10)
INSERT INTO past_trips (
  year, start_date, end_date,
  site_id, location_name,
  hike_miles, elevation_gain_ft, campsite_elevation_ft,
  album_url, notes
) VALUES (
  2023, '2023-09-06', '2023-09-10',
  (SELECT id FROM sites WHERE name = 'Lower Velma Lake'),
  'Desolation Wilderness - Lower Velma Lake',
  4.7, 1824, 7785,
  'https://photos.app.goo.gl/pHJfnhmao5hsnbgz9',
  'Classic Desolation granite. Day hikes to Middle and Upper Velma Lakes.'
);

-- 2024: Golden Trout Wilderness - Cottonwood Lake #3 (Aug 21-25)
INSERT INTO past_trips (
  year, start_date, end_date,
  site_id, location_name,
  hike_miles, elevation_gain_ft, campsite_elevation_ft,
  album_url, notes
) VALUES (
  2024, '2024-08-21', '2024-08-25',
  (SELECT id FROM sites WHERE name = 'Cottonwood Lakes'),
  'Golden Trout Wilderness - Cottonwood Lake #3',
  5.5, 1300, 11105,
  'https://photos.app.goo.gl/WuXwDBugzP67GdXK6',
  'Highest camp yet! Beautiful high alpine lakes with views of the Sierra crest.'
);

-- 2025: Hoover Wilderness - East Lake (Jul 23-27)
INSERT INTO past_trips (
  year, start_date, end_date,
  site_id, location_name,
  hike_miles, elevation_gain_ft, campsite_elevation_ft,
  album_url, notes
) VALUES (
  2025, '2025-07-23', '2025-07-27',
  (SELECT id FROM sites WHERE name = 'East Lake'),
  'Hoover Wilderness - East Lake',
  4.4, 1576, 9476,
  'https://photos.app.goo.gl/XnvbKWHhXLYKREgB6',
  'Green Creek Trail access. Stunning alpine scenery in the Eastern Sierra.'
);
