-- ============================================
-- Migration: Add 3-Score System to Diaries
-- ============================================
-- เพิ่มคอลัมน์ positive_score และ negative_score 
-- เพื่อรองรับระบบประเมินอารมณ์แบบ 3 มิติ

ALTER TABLE diaries
ADD COLUMN positive_score INTEGER DEFAULT NULL,
ADD COLUMN negative_score INTEGER DEFAULT NULL;

-- เพิ่ม constraint เพื่อให้คะแนนอยู่ระหว่าง 0-5
ALTER TABLE diaries
ADD CONSTRAINT positive_score_range CHECK (positive_score IS NULL OR (positive_score >= 0 AND positive_score <= 5)),
ADD CONSTRAINT negative_score_range CHECK (negative_score IS NULL OR (negative_score >= 0 AND negative_score <= 5));
