/**
 * navigationService.js - Centralized Navigation Reference
 * 
 * ใช้สำหรับ navigate จากไฟล์อื่นที่ไม่ใช่ component
 * เช่น API client เมื่อเจอ 401 Unauthorized
 */

import { createNavigationContainerRef } from '@react-navigation/native';

// ref กลางสำหรับสั่ง navigation จากไฟล์ที่อยู่นอก React component tree
export const navigationRef = createNavigationContainerRef();

/**
 * Navigate to a screen
 */
export function navigate(name, params) {
  // isReady() ป้องกันการเรียกก่อน NavigationContainer mount เสร็จ
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

/**
 * Reset navigation to a specific screen (clear stack)
 */
export function reset(name) {
  if (navigationRef.isReady()) {
    // reset stack เหลือ route เดียว (ใช้หลัง login/logout บ่อย)
    navigationRef.reset({
      index: 0,
      routes: [{ name }],
    });
  }
}

/**
 * Go back
 */
export function goBack() {
  // canGoBack() กัน error กรณีไม่มีหน้าก่อนหน้าใน stack
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}
