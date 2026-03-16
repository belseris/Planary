/**
 * debugNotifications.js - Tool สำหรับแก้ไขปัญหา notification
 * 
 * นำเข้าและใช้ใน app เพื่อตรวจสอบสถานะ notification system
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { requestNotificationPermission } from './notificationService';

/**
 * ตรวจสอบทั้งหมด
 */
export const runFullDiagnostics = async () => {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║     📋 NOTIFICATION SYSTEM DIAGNOSTICS      ║');
  console.log('╚════════════════════════════════════════════╝\n');

  try {
    // 1. ตรวจสอบ Token
    console.log('1️⃣  CHECK TOKEN');
    const token = await AsyncStorage.getItem('token');
    // !!token แปลงค่าจริง/ปลอมเป็น boolean ชัดเจน
    const hasToken = !!token;
    console.log(`   Status: ${hasToken ? '✅ Found' : '❌ Not found'}`);
    if (hasToken) {
      console.log(`   Token: ${token.substring(0, 20)}...`);
    }

    // 2. ตรวจสอบ Permission
    console.log('\n2️⃣  CHECK NOTIFICATION PERMISSIONS');
    const { status } = await Notifications.getPermissionsAsync();
    console.log(`   Status: ${status}`);
    const permissionMap = {
      'granted': '✅ Granted',
      'denied': '❌ Denied',
      'undetermined': '❓ Undetermined'
    };
    console.log(`   Result: ${permissionMap[status] || status}`);

    // 3. ตรวจสอบ Pending Notifications
    console.log('\n3️⃣  CHECK PENDING NOTIFICATIONS');
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`   Count: ${pending.length}`);
    if (pending.length > 0) {
      pending.slice(0, 5).forEach((n, i) => {
        // แสดงแค่ 5 รายการแรกเพื่อไม่ให้ log ยาวเกินอ่านยาก
        const trigger = n.trigger;
        const triggerTime = trigger?.type === 'date' ? new Date(trigger.value).toLocaleString('th-TH') : 'Immediate';
        console.log(`   ${i + 1}. ${n.content.title} - Trigger: ${triggerTime}`);
      });
    }

    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║              ✅ DIAGNOSTICS COMPLETE        ║');
    console.log('╚════════════════════════════════════════════╝\n');

    return {
      hasToken,
      permissionStatus: status,
      pendingNotifications: pending.length,
    };
  } catch (error) {
    console.error('❌ Diagnostics failed:', error);
    return null;
  }
};

/**
 * ทดสอบแจ้งเตือนทันที
 */
export const testNotificationNow = async () => {
  console.log('\n🔔 TEST NOTIFICATION - Showing now...\n');
  
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ ทดสอบการแจ้งเตือน',
        body: 'ถ้าเห็นข้อความนี้แสดงว่า notification ทำงาน ✅',
        sound: 'default',
        vibrate: [0, 250, 250, 250],
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: {
          type: 'test',
          timestamp: new Date().toISOString(),
        },
      },
      trigger: null, // Show immediately
    });

    console.log(`✅ Test notification scheduled: ${notificationId}\n`);
    return notificationId;
  } catch (error) {
    console.error('❌ Failed to show test notification:', error);
    return null;
  }
};

/**
 * ขอ Permission (ถ้ายังไม่ได้)
 */
export const requestPermissionIfNeeded = async () => {
  console.log('\n🔐 REQUESTING NOTIFICATION PERMISSION\n');
  
  const hasPermission = await requestNotificationPermission();
  console.log(`Result: ${hasPermission ? '✅ Granted' : '❌ Denied'}\n`);
  
  return hasPermission;
};

/**
 * Clear ทุกอย่างและเริ่มใหม่
 */
export const resetNotificationSystem = async () => {
  console.log('\n🔄 RESETTING NOTIFICATION SYSTEM\n');
  
  try {
    // Clear all notifications
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('✅ Cleared all pending notifications');

    // Request permission fresh
    // เรียก helper เดิมเพื่อลดโค้ดซ้ำและคงพฤติกรรมการขอสิทธิ์ให้เหมือนกัน
    const hasPermission = await requestPermissionIfNeeded();
    
    console.log(`✅ System reset complete\n`);
    return hasPermission;
  } catch (error) {
    console.error('❌ Reset failed:', error);
  }
};

export default {
  runFullDiagnostics,
  testNotificationNow,
  requestPermissionIfNeeded,
  resetNotificationSystem,
};
