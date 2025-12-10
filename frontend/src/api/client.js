/**
 * src/api/client.js
 * Centralized Axios API Client
 * 
 * ฟีเจอร์:
 * 1. กำหนด BASE_URL อัตโนมัติตาม Platform (Android/iOS)
 * 2. Request Interceptor: แนบ JWT token ทุกครั้งที่เรียก API
 * 3. Response Interceptor: จัดการ 401 Unauthorized (session expiry)
 * 4. Auto-extract response.data เพื่อความสะดวก
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';

/**
 * กำหนด BASE_URL ตาม Platform:
 * - Android Emulator: 10.0.2.2 = host machine's localhost
 * - iOS Simulator/Physical device: ใช้ LAN IP ของเครื่อง
 * - Tunnel mode: ใช้ LAN IP เพื่อเข้าถึง backend บนเครือข่ายเดียวกัน
 */
const DEFAULT_LAN_IP = '192.168.0.102'; // อัปเดตเป็น IP ปัจจุบันจาก ipconfig คำสั่งเช็๋ค ipconfig | findstr "IPv4"
export const BASE_URL = `http://${DEFAULT_LAN_IP}:8000`;

/**
 * สร้าง Axios instance พร้อม config พื้นฐาน
 */
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60 วินาที (เพิ่มขึ้นเพื่อรอ bundle โหลด)
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor
 * ทำงานก่อนส่ง request ทุกครั้ง
 * - ดึง JWT token จาก AsyncStorage
 * - แนบ token เข้าไปใน Authorization header
 */
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response Interceptor
 * ทำงานหลังได้รับ response ทุกครั้ง
 * 
 * Success: คืน response.data โดยตรง (ไม่ต้อง .data ซ้ำ)
 * Error: 
 *   - 401 = Token หมดอายุ → แสดง Alert + ลบ token
 *   - อื่นๆ = คืน error message
 */
apiClient.interceptors.response.use(
  (response) => response.data, // Auto-extract data
  async (error) => {
    // จัดการ 401 Unauthorized (session expiry)
    if (error.response?.status === 401) {
      Alert.alert(
        'เซสชันหมดอายุ',
        'กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
        [{ 
          text: 'ตกลง', 
          onPress: async () => {
            await AsyncStorage.removeItem('token');
            // Note: App.js จะจับการเปลี่ยนแปลงและ navigate ไป Login
          } 
        }]
      );
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

export default apiClient;
