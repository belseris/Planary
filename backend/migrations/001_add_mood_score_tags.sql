-- Migration: Add 2D Mood System columns to diaries table
-- Date: 2025-11-13

ALTER TABLE diaries
ADD COLUMN IF NOT EXISTS mood_score VARCHAR(10) NULL,
ADD COLUMN IF NOT EXISTS mood_tags JSONB NULL;

-- Set default values for existing rows (optional)
-- UPDATE diaries SET mood_score = NULL, mood_tags = NULL WHERE mood_score IS NULL;
