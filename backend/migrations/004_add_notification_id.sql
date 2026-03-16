-- Migration: เพิ่มคอลัมน์ notification_id เพื่อเก็บ Local Notification ID
-- เพื่อให้สามารถยกเลิก/อัปเดต notification ได้ใน Frontend

ALTER TABLE activities 
ADD COLUMN notification_id VARCHAR(255) NULL;

-- Comment: เก็บ notification ID ที่ได้จาก Expo scheduleNotificationAsync()
COMMENT ON COLUMN activities.notification_id IS 'Local notification ID จาก Expo Notifications (ใช้ในการ cancel/update)';
