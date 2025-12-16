-- Add cover_photo_url column to past_trips table
-- This stores a direct image URL for the trip card display

ALTER TABLE past_trips ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;
