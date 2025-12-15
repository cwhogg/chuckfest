-- ChuckfestAI Seed: Sites
-- Run this in Supabase SQL Editor after running the members seed

-- ============================================
-- PAST CHUCKFEST LOCATIONS
-- ============================================

-- 2020: Kings Canyon - Redwood Canyon
INSERT INTO sites (
  name, region, description, latitude, longitude,
  permit_url, permit_type, permit_advance_days, permit_open_time,
  permit_cost, permit_notes,
  difficulty, distance_miles, elevation_gain_ft, peak_elevation_ft,
  photos, status
) VALUES (
  'Redwood Canyon',
  'Sierra Nevada - Kings Canyon',
  'A unique grove of giant sequoias in Kings Canyon National Park. The canyon offers a peaceful escape with towering redwoods, seasonal streams, and excellent wildlife viewing. Less crowded than the main groves.',
  36.6897, -118.9186,
  'https://www.recreation.gov/permits/445857',
  'rolling', 180, '07:00',
  5.00, 'Sequoia & Kings Canyon permit. Bear canister required. 6-month advance booking.',
  'easy', 3.6, 1078, 6300,
  ARRAY['https://placehold.co/800x600?text=Redwood+Canyon'],
  'active'
);

-- 2021: Sequoia - Mosquito Lakes
INSERT INTO sites (
  name, region, description, latitude, longitude,
  permit_url, permit_type, permit_advance_days, permit_open_time,
  permit_cost, permit_notes,
  difficulty, distance_miles, elevation_gain_ft, peak_elevation_ft,
  photos, status
) VALUES (
  'Mosquito Lakes',
  'Sierra Nevada - Sequoia',
  'A chain of five stunning alpine lakes in the Mineral King area of Sequoia National Park. The second lake offers excellent camping with granite surroundings and clear, cold water. Classic High Sierra scenery.',
  36.4389, -118.5847,
  'https://www.recreation.gov/permits/445857',
  'rolling', 180, '07:00',
  5.00, 'Sequoia & Kings Canyon permit. Bear canister required. Mineral King road is winding and slow - allow extra time.',
  'moderate', 4.0, 2377, 9600,
  ARRAY['https://placehold.co/800x600?text=Mosquito+Lakes'],
  'active'
);

-- 2022: Dinkey Lakes - Cliff Lake
INSERT INTO sites (
  name, region, description, latitude, longitude,
  permit_url, permit_type, permit_advance_days, permit_open_time,
  permit_cost, permit_notes,
  difficulty, distance_miles, elevation_gain_ft, peak_elevation_ft,
  photos, status
) VALUES (
  'Cliff Lake',
  'Sierra Nevada - Dinkey Lakes Wilderness',
  'A beautiful alpine lake nestled beneath dramatic granite cliffs in the Dinkey Lakes Wilderness. The area features numerous interconnected lakes perfect for day hikes from base camp. Excellent fishing and swimming.',
  37.1456, -119.0847,
  'https://www.recreation.gov/permits/445858',
  'rolling', 180, '07:00',
  5.00, 'Sierra National Forest permit. Bear canister recommended. Less crowded than nearby wilderness areas.',
  'moderate', 5.1, 1358, 9485,
  ARRAY['https://placehold.co/800x600?text=Cliff+Lake'],
  'active'
);

-- 2023: Desolation Wilderness - Lower Velma Lake
INSERT INTO sites (
  name, region, description, latitude, longitude,
  permit_url, permit_type, permit_advance_days, permit_open_time,
  permit_cost, permit_notes,
  difficulty, distance_miles, elevation_gain_ft, peak_elevation_ft,
  photos, status
) VALUES (
  'Lower Velma Lake',
  'Desolation Wilderness',
  'One of the classic Desolation Wilderness destinations with stunning granite basins and crystal-clear water. Easy access to Middle and Upper Velma Lakes for day hikes. Popular but spacious camping areas.',
  38.9478, -120.1456,
  'https://www.recreation.gov/permits/233261',
  'rolling', 180, '07:00',
  10.00, 'Desolation Wilderness permit. Zone quota system - book your destination zone. Bear canister REQUIRED. No campfires allowed.',
  'moderate', 4.7, 1824, 7785,
  ARRAY['https://placehold.co/800x600?text=Lower+Velma+Lake'],
  'active'
);

-- 2024: Golden Trout Wilderness - Cottonwood Lake #3
INSERT INTO sites (
  name, region, description, latitude, longitude,
  permit_url, permit_type, permit_advance_days, permit_open_time,
  permit_cost, permit_notes,
  difficulty, distance_miles, elevation_gain_ft, peak_elevation_ft,
  photos, status
) VALUES (
  'Cottonwood Lakes',
  'Eastern Sierra - Golden Trout Wilderness',
  'High alpine lakes at over 11,000 feet in the Golden Trout Wilderness, accessed via Horseshoe Meadow. Stunning views of the Sierra crest and excellent acclimatization for higher altitude adventures. Lake #3 offers the best camping.',
  36.4689, -118.1847,
  'https://www.recreation.gov/permits/233262',
  'rolling', 182, '07:00',
  5.00, 'Inyo National Forest permit. 60% quota released 6 months ahead, 40% released 2 weeks ahead at 7am PT. Bear canister REQUIRED. No campfires.',
  'moderate', 5.5, 1300, 11105,
  ARRAY['https://placehold.co/800x600?text=Cottonwood+Lakes'],
  'active'
);

-- 2025: Hoover Wilderness - East Lake
INSERT INTO sites (
  name, region, description, latitude, longitude,
  permit_url, permit_type, permit_advance_days, permit_open_time,
  permit_cost, permit_notes,
  difficulty, distance_miles, elevation_gain_ft, peak_elevation_ft,
  photos, status
) VALUES (
  'East Lake',
  'Eastern Sierra - Hoover Wilderness',
  'A stunning alpine lake accessed via the Green Creek Trail in the Hoover Wilderness. Dramatic mountain backdrop with excellent fishing and opportunities for day hikes to nearby West Lake and Green Lake.',
  38.1034, -119.2847,
  'https://www.recreation.gov/permits/445856',
  'rolling', 180, '07:00',
  8.00, 'Hoover Wilderness permit. 50% quota reservable in advance, 50% available 3 days before. Bear canister REQUIRED. Max group size 15.',
  'moderate', 4.4, 1576, 9476,
  ARRAY['https://placehold.co/800x600?text=East+Lake'],
  'active'
);

-- ============================================
-- ADDITIONAL SITES - DESOLATION WILDERNESS
-- ============================================

INSERT INTO sites (
  name, region, description, latitude, longitude,
  permit_url, permit_type, permit_advance_days, permit_open_time,
  permit_cost, permit_notes,
  difficulty, distance_miles, elevation_gain_ft, peak_elevation_ft,
  photos, status
) VALUES (
  'Lake Aloha',
  'Desolation Wilderness',
  'The largest lake in Desolation Wilderness, Lake Aloha is a stunning shallow lake dotted with granite islands. Accessible via Echo Lakes (with optional water taxi) or Glen Alpine. Feels like a High Sierra archipelago.',
  38.8847, -120.0978,
  'https://www.recreation.gov/permits/233261',
  'rolling', 180, '07:00',
  10.00, 'Desolation Wilderness permit. Water taxi available from Echo Lakes ($22/person each way, saves 2.5 miles). Bear canister REQUIRED. No campfires.',
  'moderate', 6.7, 1860, 8116,
  ARRAY['https://placehold.co/800x600?text=Lake+Aloha'],
  'active'
);

INSERT INTO sites (
  name, region, description, latitude, longitude,
  permit_url, permit_type, permit_advance_days, permit_open_time,
  permit_cost, permit_notes,
  difficulty, distance_miles, elevation_gain_ft, peak_elevation_ft,
  photos, status
) VALUES (
  'Gilmore Lake',
  'Desolation Wilderness',
  'A beautiful alpine lake nestled at the base of Mt. Tallac with stunning views of Lake Tahoe from the surrounding ridges. Popular but less crowded than Velma Lakes. Great base camp for day hikes.',
  38.9156, -120.0847,
  'https://www.recreation.gov/permits/233261',
  'rolling', 180, '07:00',
  10.00, 'Desolation Wilderness permit. Bear canister REQUIRED. No campfires. Can combine with Mt. Tallac summit day hike.',
  'moderate', 4.5, 1700, 8300,
  ARRAY['https://placehold.co/800x600?text=Gilmore+Lake'],
  'active'
);

-- ============================================
-- ADDITIONAL SITES - JOHN MUIR WILDERNESS / INYO NF
-- ============================================

INSERT INTO sites (
  name, region, description, latitude, longitude,
  permit_url, permit_type, permit_advance_days, permit_open_time,
  permit_cost, permit_notes,
  difficulty, distance_miles, elevation_gain_ft, peak_elevation_ft,
  photos, status
) VALUES (
  'Chickenfoot Lake',
  'Eastern Sierra - Little Lakes Valley',
  'Part of the stunning Little Lakes Valley chain, Chickenfoot Lake sits at nearly 11,000 feet with minimal elevation gain from the highest trailhead in the Sierra (Mosquito Flat). Perfect for high altitude acclimatization with easy terrain.',
  37.4289, -118.7456,
  'https://www.recreation.gov/permits/233262',
  'rolling', 182, '07:00',
  5.00, 'Inyo National Forest permit. Very competitive permits - book exactly 6 months out. Bear canister REQUIRED. Trailhead parking fills early.',
  'easy', 3.5, 500, 10761,
  ARRAY['https://placehold.co/800x600?text=Chickenfoot+Lake'],
  'active'
);

INSERT INTO sites (
  name, region, description, latitude, longitude,
  permit_url, permit_type, permit_advance_days, permit_open_time,
  permit_cost, permit_notes,
  difficulty, distance_miles, elevation_gain_ft, peak_elevation_ft,
  photos, status
) VALUES (
  'Long Lake (Bishop Creek)',
  'Eastern Sierra - John Muir Wilderness',
  'A gorgeous alpine lake along the Bishop Pass Trail with stunning views of the Inconsolable Range. Part of a chain of lakes including Saddlerock, Bishop, and Chocolate Lakes for excellent day hiking options.',
  37.1678, -118.5689,
  'https://www.recreation.gov/permits/233262',
  'rolling', 182, '07:00',
  5.00, 'Inyo National Forest permit. Popular trailhead - competitive permits. Bear canister REQUIRED. Excellent fishing.',
  'moderate', 4.8, 2100, 10750,
  ARRAY['https://placehold.co/800x600?text=Long+Lake+Bishop'],
  'active'
);

INSERT INTO sites (
  name, region, description, latitude, longitude,
  permit_url, permit_type, permit_advance_days, permit_open_time,
  permit_cost, permit_notes,
  difficulty, distance_miles, elevation_gain_ft, peak_elevation_ft,
  photos, status
) VALUES (
  'Big Pine Lakes (First & Second Lake)',
  'Eastern Sierra - John Muir Wilderness',
  'Spectacular turquoise alpine lakes fed by the Palisade Glacier - the southernmost glacier in the US. First and Second Lakes offer accessible camping with views of Temple Crag and the Palisades. Iconic Eastern Sierra destination.',
  37.1289, -118.4156,
  'https://www.recreation.gov/permits/233262',
  'rolling', 182, '07:00',
  5.00, 'Inyo National Forest permit. EXTREMELY competitive - one of the hardest Sierra permits to get. Bear canister REQUIRED.',
  'moderate', 4.8, 2297, 9957,
  ARRAY['https://placehold.co/800x600?text=Big+Pine+Lakes'],
  'active'
);

INSERT INTO sites (
  name, region, description, latitude, longitude,
  permit_url, permit_type, permit_advance_days, permit_open_time,
  permit_cost, permit_notes,
  difficulty, distance_miles, elevation_gain_ft, peak_elevation_ft,
  photos, status
) VALUES (
  'Kearsarge Lakes',
  'Eastern Sierra - John Muir Wilderness',
  'A cluster of beautiful alpine lakes accessed via Onion Valley, one of the highest trailheads in the Sierra. Gateway to the backcountry with options to continue to Charlotte Lake or connect to the JMT/PCT.',
  36.7856, -118.3847,
  'https://www.recreation.gov/permits/233262',
  'rolling', 182, '07:00',
  5.00, 'Inyo National Forest permit. Popular as JMT resupply point. Bear canister REQUIRED. Steep but well-maintained trail.',
  'moderate', 4.5, 2600, 10800,
  ARRAY['https://placehold.co/800x600?text=Kearsarge+Lakes'],
  'active'
);

-- ============================================
-- ADDITIONAL SITES - ANSEL ADAMS WILDERNESS
-- ============================================

INSERT INTO sites (
  name, region, description, latitude, longitude,
  permit_url, permit_type, permit_advance_days, permit_open_time,
  permit_cost, permit_notes,
  difficulty, distance_miles, elevation_gain_ft, peak_elevation_ft,
  photos, status
) VALUES (
  'Ediza Lake',
  'Eastern Sierra - Ansel Adams Wilderness',
  'A stunning alpine lake beneath the dramatic Minarets, one of the most photographed mountain scenes in the Sierra. Access via Shadow Creek Trail from Agnew Meadows offers the most direct route.',
  37.6689, -119.1847,
  'https://www.recreation.gov/permits/233262',
  'rolling', 182, '07:00',
  5.00, 'Inyo National Forest permit. Quota of 12 advance + 8 walk-up per day. Bear canister REQUIRED. Shuttle required to Agnew Meadows in summer.',
  'moderate', 6.0, 1500, 9300,
  ARRAY['https://placehold.co/800x600?text=Ediza+Lake'],
  'active'
);

INSERT INTO sites (
  name, region, description, latitude, longitude,
  permit_url, permit_type, permit_advance_days, permit_open_time,
  permit_cost, permit_notes,
  difficulty, distance_miles, elevation_gain_ft, peak_elevation_ft,
  photos, status
) VALUES (
  'Thousand Island Lake',
  'Eastern Sierra - Ansel Adams Wilderness',
  'One of the most iconic alpine lakes in the Sierra with countless granite islands and Banner Peak as a backdrop. A bucket-list destination on the JMT/PCT. Longer approach but worth every step.',
  37.6978, -119.1956,
  'https://www.recreation.gov/permits/233262',
  'rolling', 182, '07:00',
  5.00, 'Inyo National Forest permit via Agnew Meadows. Very competitive permits. Bear canister REQUIRED. Consider the High Trail route for best views.',
  'moderate', 8.1, 2900, 9833,
  ARRAY['https://placehold.co/800x600?text=Thousand+Island+Lake'],
  'active'
);

-- ============================================
-- ADDITIONAL SITES - EMIGRANT WILDERNESS
-- ============================================

INSERT INTO sites (
  name, region, description, latitude, longitude,
  permit_url, permit_type, permit_advance_days, permit_open_time,
  permit_cost, permit_notes,
  difficulty, distance_miles, elevation_gain_ft, peak_elevation_ft,
  photos, status
) VALUES (
  'Emigrant Lake',
  'Emigrant Wilderness',
  'The namesake lake of the Emigrant Wilderness offers a relatively easy approach with classic granite Sierra scenery. Less crowded than nearby wilderness areas with excellent fishing and multiple nearby lakes for exploration.',
  38.1456, -119.7847,
  'https://www.fs.usda.gov/r05/stanislaus/permits/wilderness-permits',
  'rolling', 7, '08:00',
  0.00, 'FREE permit - no quota system! Can get permit by phone up to 7 days ahead or self-issue at Summit Ranger Station 24/7. One of the easiest Sierra permits.',
  'moderate', 4.5, 1200, 8800,
  ARRAY['https://placehold.co/800x600?text=Emigrant+Lake'],
  'active'
);

INSERT INTO sites (
  name, region, description, latitude, longitude,
  permit_url, permit_type, permit_advance_days, permit_open_time,
  permit_cost, permit_notes,
  difficulty, distance_miles, elevation_gain_ft, peak_elevation_ft,
  photos, status
) VALUES (
  'Bear Lake (Emigrant)',
  'Emigrant Wilderness',
  'A picturesque alpine lake in the Emigrant Wilderness with granite domes and excellent swimming. Less traveled than other Sierra destinations, offering solitude and classic High Sierra beauty without permit hassles.',
  38.2134, -119.7456,
  'https://www.fs.usda.gov/r05/stanislaus/permits/wilderness-permits',
  'rolling', 7, '08:00',
  0.00, 'FREE permit - no quota system! Self-issue available 24/7 at Summit Ranger Station. One-night camping limit at Bear Lake.',
  'moderate', 5.2, 1400, 8600,
  ARRAY['https://placehold.co/800x600?text=Bear+Lake+Emigrant'],
  'active'
);

-- ============================================
-- ADDITIONAL SITES - SEQUOIA/KINGS CANYON
-- ============================================

INSERT INTO sites (
  name, region, description, latitude, longitude,
  permit_url, permit_type, permit_advance_days, permit_open_time,
  permit_cost, permit_notes,
  difficulty, distance_miles, elevation_gain_ft, peak_elevation_ft,
  photos, status
) VALUES (
  'Pear Lake',
  'Sierra Nevada - Sequoia',
  'A stunning alpine lake in the Tablelands area of Sequoia National Park, accessed from Wolverton. The dramatic granite cirque setting and deep blue water make this one of the park''s most beautiful backcountry destinations.',
  36.5689, -118.7156,
  'https://www.recreation.gov/permits/445857',
  'rolling', 180, '07:00',
  5.00, 'Sequoia & Kings Canyon permit. Popular destination - book early. Bear canister required. Winter ski hut at Pear Lake.',
  'moderate', 6.4, 2300, 9510,
  ARRAY['https://placehold.co/800x600?text=Pear+Lake'],
  'active'
);

INSERT INTO sites (
  name, region, description, latitude, longitude,
  permit_url, permit_type, permit_advance_days, permit_open_time,
  permit_cost, permit_notes,
  difficulty, distance_miles, elevation_gain_ft, peak_elevation_ft,
  photos, status
) VALUES (
  'Heather Lake',
  'Sierra Nevada - Sequoia',
  'A beautiful alpine lake along the Lakes Trail in Sequoia National Park, part of a chain that includes Aster and Pear Lakes. Offers excellent camping with options to explore the Tablelands and Silliman Crest.',
  36.5789, -118.7256,
  'https://www.recreation.gov/permits/445857',
  'rolling', 180, '07:00',
  5.00, 'Sequoia & Kings Canyon permit. Part of the Lakes Trail chain. Bear canister required. Can be combined with Pear Lake visit.',
  'moderate', 4.2, 1700, 9200,
  ARRAY['https://placehold.co/800x600?text=Heather+Lake'],
  'active'
);

-- ============================================
-- ADDITIONAL SITES - HOOVER WILDERNESS
-- ============================================

INSERT INTO sites (
  name, region, description, latitude, longitude,
  permit_url, permit_type, permit_advance_days, permit_open_time,
  permit_cost, permit_notes,
  difficulty, distance_miles, elevation_gain_ft, peak_elevation_ft,
  photos, status
) VALUES (
  'Green Lake',
  'Eastern Sierra - Hoover Wilderness',
  'A beautiful lake along the Green Creek Trail, closer to the trailhead than East Lake. Offers excellent camping, fishing, and stunning mountain views. Great option for a shorter approach or first night camp.',
  38.0978, -119.2756,
  'https://www.recreation.gov/permits/445856',
  'rolling', 180, '07:00',
  8.00, 'Hoover Wilderness permit. Same system as East Lake - 50% advance, 50% available 3 days before. Bear canister REQUIRED.',
  'easy', 3.2, 1100, 8950,
  ARRAY['https://placehold.co/800x600?text=Green+Lake'],
  'active'
);

INSERT INTO sites (
  name, region, description, latitude, longitude,
  permit_url, permit_type, permit_advance_days, permit_open_time,
  permit_cost, permit_notes,
  difficulty, distance_miles, elevation_gain_ft, peak_elevation_ft,
  photos, status
) VALUES (
  'Virginia Lakes Basin',
  'Eastern Sierra - Hoover Wilderness',
  'A stunning high alpine basin with multiple lakes surrounded by dramatic peaks. Short approach from Virginia Lakes trailhead makes this accessible while still feeling remote. Options for day hikes to Summit Lake and beyond.',
  38.0456, -119.2456,
  'https://www.recreation.gov/permits/445856',
  'rolling', 180, '07:00',
  8.00, 'Hoover Wilderness permit. Less crowded than Green Creek area. Bear canister REQUIRED. Beautiful fall colors in September.',
  'easy', 2.5, 800, 9800,
  ARRAY['https://placehold.co/800x600?text=Virginia+Lakes'],
  'active'
);
