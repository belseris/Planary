-- Migration: เพิ่ม notification fields ใน activities table
-- สำหรับรองรับ Notification System

-- เพิ่ม columns ใหม่
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS remind_type VARCHAR(20) DEFAULT 'simple';

ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS remind_sound BOOLEAN DEFAULT TRUE;

ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE;

-- อัพเดทข้อมูลเดิมให้มีค่า default
UPDATE activities 
SET remind_type = 'simple' 
WHERE remind_type IS NULL;

UPDATE activities 
SET remind_sound = TRUE 
WHERE remind_sound IS NULL;

UPDATE activities 
SET notification_sent = FALSE 
WHERE notification_sent IS NULL;
