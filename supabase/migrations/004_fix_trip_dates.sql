-- Fix trip year dates to be Wednesday-Sunday
-- Jul 14, 2026 (Tue) should be Jul 15, 2026 (Wed)
-- Jul 18, 2026 (Sat) should be Jul 19, 2026 (Sun)

UPDATE trip_years
SET final_start_date = '2026-07-15',
    final_end_date = '2026-07-19'
WHERE year = 2026
  AND final_start_date = '2026-07-14';
