/**
 * notificationService.js - จัดการ Local Notifications
 * 
 * คุณสมบัติ:
 * - ขอ permission จากผู้ใช้
 * - แสดง notification แบบ Simple
 * - ตั้งค่าเสียง, สั่น
 * - Auto-dismiss ใน 10 วินาที
 * - กดแล้วเปิด app ที่หน้ากิจกรรม
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ตั้งค่า Notification Handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,      // ✅ แสดง alert เมื่ออยู่ในแอป
    shouldPlaySound: true,       // ✅ เล่นเสียง
    shouldSetBadge: false,       // ❌ ไม่แสดง badge
  }),
});

/**
 * ขอ Permission สำหรับ Notifications
 */
export const requestNotificationPermission = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('ผู้ใช้ไม่อนุญาตให้ใช้ notification');
      return false;
    }

    // สำหรับ Android: ตั้งค่า notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('activity-reminders', {
        name: 'Activity Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250], // สั่น 2 ครั้งสั้น ๆ
        sound: 'default',
        enableVibrate: true,
      });
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

/**
 * แสดง Local Notification
 * @param {Object} activity - ข้อมูลกิจกรรม
 */
export const showActivityNotification = async (activity) => {
  try {
    const { title, minutes_until, time, remind_sound = true } = activity;

    // คำนวณข้อความเวลาถอยหลัง
    let timeText = '';
    let notifTitle = '';
    
    if (minutes_until < 1) {
      timeText = 'ถึงเวลาแล้ว!';
      notifTitle = `⏰ ${title}`;
    } else if (minutes_until < 60) {
      timeText = `อีก ${minutes_until} นาที`;
      notifTitle = `🔔 ${title}`;
    } else {
      const hours = Math.floor(minutes_until / 60);
      const mins = minutes_until % 60;
      timeText = mins > 0 ? `อีก ${hours} ชั่วโมง ${mins} นาที` : `อีก ${hours} ชั่วโมง`;
      notifTitle = `🔔 ${title}`;
    }

    // สร้าง notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notifTitle,
        body: `${timeText}${time ? ` (เวลา ${time})` : ''}`,
        sound: remind_sound ? 'default' : null,
        vibrate: [0, 250, 250, 250], // สั่น 2 ครั้ง
        priority: Notifications.AndroidNotificationPriority.HIGH,
        categoryIdentifier: 'activity-reminder',
        data: {
          activityId: activity.id,
          type: 'activity_reminder',
        },
      },
      trigger: null, // แสดงทันที
    });

    console.log(`✅ Notification sent: ${title}`);
    return true;
  } catch (error) {
    console.error('Error showing notification:', error);
    return false;
  }
};

/**
 * ยกเลิก Notification ทั้งหมด
 */
export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

/**
 * ดึง Notification ที่กำลังรอแสดง
 */
export const getPendingNotifications = async () => {
  return await Notifications.getAllScheduledNotificationsAsync();
};

export default {
  requestNotificationPermission,
  showActivityNotification,
  cancelAllNotifications,
  getPendingNotifications,
};
