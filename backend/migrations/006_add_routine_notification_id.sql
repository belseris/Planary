ALTER TABLE routine_activities
ADD COLUMN IF NOT EXISTS notification_id VARCHAR(255) NULL;

COMMENT ON COLUMN routine_activities.notification_id IS 'Local notification ID สำหรับเตือนซ้ำรายสัปดาห์';
