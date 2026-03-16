/**
 * notificationService.js - จัดการ Local Notifications
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ตั้งค่า Notification Handler (บังคับโชว์ป๊อปอัปแม้จะเปิดแอปอยู่)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,      // ✅ บังคับโชว์ป๊อปอัป
    shouldShowList: true,        // ✅ ให้อยู่ในศูนย์แจ้งเตือน
    shouldPlaySound: true,       // ✅ เล่นเสียง
    shouldSetBadge: false,       
  }),
});

/**
 * ขอ Permission สำหรับ Notifications และสร้าง Channel
 */
export const requestNotificationPermission = async () => {
  try {
    // อ่านสถานะเดิมก่อน เพื่อไม่ยิง permission prompt ซ้ำโดยไม่จำเป็น
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

    // ✅ บังคับสร้าง Channel ชื่อ 'default' สำหรับ Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Activity Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
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
 * แสดง Local Notification ทันที (สำหรับปุ่มทดสอบยิงสด)
 */
export const showActivityNotification = async (activity) => {
  try {
    // minutes_until = เวลาที่เหลือก่อนกิจกรรม (หน่วย: นาที)
    const { title, minutes_until, time, remind_sound = true } = activity;

    let timeText = '';
    let notifTitle = '';
    
    if (minutes_until < 1) {
      timeText = 'ถึงเวลาแล้ว!';
      notifTitle = `⏰ ${title}`;
    } else if (minutes_until < 60) {
      // กรณีต่ำกว่า 1 ชั่วโมง แสดงเป็นนาที
      timeText = `อีก ${minutes_until} นาที`;
      notifTitle = `🔔 ${title}`;
    } else {
      // กรณีมากกว่า/เท่ากับ 1 ชั่วโมง แยกเป็น ชั่วโมง + นาที
      const hours = Math.floor(minutes_until / 60);
      const mins = minutes_until % 60;
      timeText = mins > 0 ? `อีก ${hours} ชั่วโมง ${mins} นาที` : `อีก ${hours} ชั่วโมง`;
      notifTitle = `🔔 ${title}`;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: notifTitle,
        body: `${timeText}${time ? ` (เวลา ${time})` : ''}`,
        sound: remind_sound ? 'default' : null,
        vibrate: [0, 250, 250, 250],
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: {
          activityId: activity.id,
          type: 'activity_reminder',
        },
      },
      trigger: {
        seconds: 1, // เด้งทันทีใน 1 วิ
        channelId: 'default',
      },
    });

    console.log(`✅ Notification sent immediately: ${title}`);
    return true;
  } catch (error) {
    console.error('Error showing notification:', error);
    return false;
  }
};

/**
 * Schedule Local Notification ล่วงหน้า (seconds-based trigger)
 */
export const scheduleActivityNotification = async ({ title, activityId, triggerDate, remindSound = true }) => {
  try {
    const now = new Date();
    // รองรับทั้ง Date object และ string
    const validTriggerDate = triggerDate instanceof Date ? triggerDate : new Date(triggerDate);

    // ดักจับ Error ถ้าเวลาพัง
    if (isNaN(validTriggerDate.getTime())) {
      console.error('❌ Error: รูปแบบเวลา triggerDate ไม่ถูกต้อง ->', triggerDate);
      return null;
    }
    
    // ถัาเวลาเป็นอดีต ข้ามการแจ้งเตือน
    if (validTriggerDate <= now) {
      console.log('⏭️ เวลาแจ้งเตือนผ่านไปแล้ว ข้ามการตั้งเวลา');
      return null;
    }

    // คำนวณเวลาที่เหลือ: ms -> นาที โดยปัดลง
    const minutesUntil = Math.floor((validTriggerDate.getTime() - now.getTime()) / 1000 / 60);
    let timeText = '';
    let notifTitle = '';
    
    if (minutesUntil < 1) {
      timeText = 'ถึงเวลาแล้ว!';
      notifTitle = `⏰ ${title}`;
    } else if (minutesUntil < 60) {
      timeText = `อีก ${minutesUntil} นาที`;
      notifTitle = `🔔 ${title}`;
    } else {
      const hours = Math.floor(minutesUntil / 60);
      const mins = minutesUntil % 60;
      timeText = mins > 0 ? `อีก ${hours} ชั่วโมง ${mins} นาที` : `อีก ${hours} ชั่วโมง`;
      notifTitle = `🔔 ${title}`;
    }

    console.log(`[DEBUG] กำลังตั้งเวลาแจ้งเตือน: ${title} ตอน ${validTriggerDate.toLocaleString('th-TH')}`);
    const secondsUntilTrigger = Math.max(
      1,
      // คำนวณระยะรอเป็นวินาที และบังคับขั้นต่ำ 1 วินาทีเพื่อกันค่า 0/ติดลบ
      Math.floor((validTriggerDate.getTime() - now.getTime()) / 1000)
    );
    console.log(`[DEBUG] จะแจ้งเตือนในอีก ${secondsUntilTrigger} วินาที`);
    
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: notifTitle,
        body: timeText,
        sound: remindSound ? 'default' : null,
        vibrate: [0, 250, 250, 250],
        priority: Notifications.AndroidNotificationPriority.HIGH,
        categoryIdentifier: 'activity-reminder',
        data: {
          activityId,
          type: 'activity_reminder',
        },
      },
      trigger: {
        type: 'timeInterval',
        seconds: secondsUntilTrigger,
        repeats: false,
        channelId: 'default',
      },
    });

    console.log(`✅ Notification scheduled สำเร็จ (ID: ${notificationId})`);
    return notificationId;
  } catch (error) {
    console.error('❌ Error scheduling notification:', error);
    return null;
  }
};

/**
 * ยกเลิก Notification ที่กำหนด
 */
export const cancelScheduledNotification = async (notificationId) => {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log(`🗑️ Cancelled notification: ${notificationId}`);
  } catch (error) {
    console.error('❌ Error cancelling notification:', error);
  }
};

/**
 * ยกเลิก Notification ทั้งหมด
 */
export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log(`🗑️ Cancelled ALL scheduled notifications`);
  } catch (error) {
    console.error('❌ Error cancelling all notifications:', error);
  }
};

/**
 * ดึง Notification ที่กำลังรอแสดง
 */
export const getPendingNotifications = async () => {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('❌ Error getting pending notifications:', error);
    return [];
  }
};

export default {
  requestNotificationPermission,
  showActivityNotification,
  scheduleActivityNotification,
  scheduleWeeklyRoutineNotification,
  cancelScheduledNotification,
  cancelAllNotifications,
  getPendingNotifications,
};

const WEEKDAY_MAP = {
  // Expo weekday: 1=Sun ... 7=Sat
  sun: 1,
  mon: 2,
  tue: 3,
  wed: 4,
  thu: 5,
  fri: 6,
  sat: 7,
};

const getNextWeeklyTriggerDate = (weekday, hour, minute) => {
  const now = new Date();
  const target = new Date(now);
  const currentWeekday = now.getDay(); // 0=Sun..6=Sat
  // แปลง weekday ของ Expo (1..7) ให้เทียบกับ getDay() ได้
  const targetWeekday = (weekday - 1 + 7) % 7;
  let dayDiff = targetWeekday - currentWeekday;
  // ถ้าเลยเวลาของวันนี้แล้ว ให้เลื่อนไปสัปดาห์ถัดไป
  if (dayDiff < 0 || (dayDiff === 0 && (now.getHours() > hour || (now.getHours() === hour && now.getMinutes() >= minute)))) {
    dayDiff += 7;
  }
  target.setDate(now.getDate() + dayDiff);
  target.setHours(hour, minute, 0, 0);
  return target;
};

export const scheduleWeeklyRoutineNotification = async ({
  title,
  weekdayKey,
  time,
  remindOffsetMin = 0,
  remindSound = true,
}) => {
  try {
    const weekday = WEEKDAY_MAP[weekdayKey];
    if (!weekday || !time) return null;

    const [h, m] = String(time).slice(0, 5).split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;

    // Apply offset นาทีล่วงหน้า (อาจทำให้วันเลื่อนไปวันก่อนหน้า)
    let totalMinutes = h * 60 + m - Number(remindOffsetMin || 0);
    let adjustedWeekday = weekday;
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60;
      adjustedWeekday = weekday === 1 ? 7 : weekday - 1;
    }
    const adjHour = Math.floor(totalMinutes / 60);
    const adjMinute = totalMinutes % 60;

    const nextTrigger = getNextWeeklyTriggerDate(adjustedWeekday, adjHour, adjMinute);
    console.log(`[DEBUG] กำลังตั้งเวลาแจ้งเตือน (weekly): ${title} ตอน ${nextTrigger.toLocaleString('th-TH')}`);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🔔 ${title}`,
        body: 'ถึงเวลาแล้ว! (เตือนซ้ำรายสัปดาห์)',
        sound: remindSound ? 'default' : null,
        vibrate: [0, 250, 250, 250],
        priority: Notifications.AndroidNotificationPriority.HIGH,
        categoryIdentifier: 'activity-reminder',
        data: {
          type: 'routine_weekly_reminder',
        },
      },
      trigger: {
        weekday: adjustedWeekday,
        hour: adjHour,
        minute: adjMinute,
        repeats: true,
        channelId: 'default',
      },
    });

    console.log(`✅ Weekly notification scheduled (ID: ${notificationId})`);
    return notificationId;
  } catch (error) {
    console.error('❌ Error scheduling weekly notification:', error);
    return null;
  }
};