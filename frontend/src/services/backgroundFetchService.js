/**
 * backgroundFetchService.js - Background Task สำหรับตรวจสอบกิจกรรมที่จะมาถึง
 * 
 * คุณสมบัติ:
 * - ทำงานทุก 10 นาที (แม้ app ปิด)
 * - ดึงกิจกรรมที่จะมาถึงจาก backend
 * - แสดง notification อัตโนมัติ
 */

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { getUpcomingActivities } from '../api/activities';
import { showActivityNotification } from './notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKGROUND_FETCH_TASK = 'activity-reminder-background-fetch';

/**
 * กำหนด Background Task
 */
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    const timestamp = new Date().toLocaleTimeString('th-TH');
    console.log(`\n========== BACKGROUND FETCH [${timestamp}] ==========`);

    // ตรวจสอบว่า user login อยู่หรือไม่
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      console.log('❌ No token found, skipping background fetch');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    console.log('✅ Token found, proceeding...');

    // ดึงกิจกรรมที่จะมาถึง
    console.log('📡 Fetching upcoming activities from server...');
    const response = await getUpcomingActivities();
    const activities = response.data || [];

    console.log(`📋 Found ${activities.length} upcoming activities`);
    
    if (activities.length > 0) {
      console.log('🔔 Activities to notify:', activities);
      // แสดง notification สำหรับแต่ละกิจกรรม
      for (const activity of activities) {
        console.log(`🔊 Showing notification for: ${activity.title}`);
        await showActivityNotification(activity);
      }

      return BackgroundFetch.BackgroundFetchResult.NewData;
    }

    console.log('⏰ No activities in next 30 minutes');
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('❌ Background fetch error:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * ลงทะเบียน Background Fetch
 */
export const registerBackgroundFetch = async () => {
  try {
    const status = await BackgroundFetch.getStatusAsync();
    
    // ตรวจสอบว่า background fetch พร้อมใช้งานหรือไม่
    if (status === BackgroundFetch.BackgroundFetchStatus.Available) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: 10 * 60, // ทุก 10 นาที (600 วินาที)
        stopOnTerminate: false,   // ทำงานต่อแม้ app ปิด
        startOnBoot: true,        // เริ่มใหม่เมื่อเปิดเครื่อง
      });

      console.log('✅ Background fetch registered successfully');
      return true;
    } else {
      console.warn('⚠️ Background fetch not available');
      return false;
    }
  } catch (error) {
    console.error('❌ Error registering background fetch:', error);
    return false;
  }
};

/**
 * ยกเลิก Background Fetch
 */
export const unregisterBackgroundFetch = async () => {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
    console.log('✅ Background fetch unregistered');
    return true;
  } catch (error) {
    console.error('❌ Error unregistering background fetch:', error);
    return false;
  }
};

/**
 * ตรวจสอบสถานะ Background Fetch
 */
export const checkBackgroundFetchStatus = async () => {
  const status = await BackgroundFetch.getStatusAsync();
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);

  return {
    status,
    isRegistered,
    statusText: 
      status === BackgroundFetch.BackgroundFetchStatus.Available ? 'Available' :
      status === BackgroundFetch.BackgroundFetchStatus.Denied ? 'Denied' :
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ? 'Restricted' : 'Unknown'
  };
};

export default {
  registerBackgroundFetch,
  unregisterBackgroundFetch,
  checkBackgroundFetchStatus,
};
