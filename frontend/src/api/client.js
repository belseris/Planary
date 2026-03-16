/**
 * src/api/client.js
 * Centralized Axios API Client
 * * ฟีเจอร์:
 * 1. กำหนด BASE_URL อัตโนมัติตาม Platform (Android/iOS)
 * 2. Request Interceptor: แนบ JWT token ทุกครั้งที่เรียก API
 * 3. Response Interceptor: จัดการ 401 Unauthorized (session expiry)
 * 4. Auto-extract response.data เพื่อความสะดวก
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import * as navigationService from '../services/navigationService';

/**
 * กำหนด BASE_URL 
 * เปลี่ยนมาใช้ IP เครื่องคอมพิวเตอร์ (192.168.10.147) แทน 
 * เพื่อให้มือถือที่ต่อ WiFi เดียวกันสามารถยิง API เข้ามาหาคอมพิวเตอร์ได้
 */
const getBaseUrl = () => {
  const envHost = process.env.EXPO_PUBLIC_API_HOST || process.env.API_HOST;
  if (envHost) return `http://${envHost}:8000`;
  
  // ✅ ใช้ IP เครื่องจริง (192.168.10.147) สำหรับ Emulator
  return 'http://172.20.10.3:8000'; 
};

export const BASE_URL = getBaseUrl();

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
 * * Success: คืน response.data โดยตรง (ไม่ต้อง .data ซ้ำ)
 * Error: 
 * - 401 = Token หมดอายุ → แสดง Alert + ลบ token
 * - อื่นๆ = คืน error message
 */
apiClient.interceptors.response.use(
  (response) => response.data, // Auto-extract data
  async (error) => {
    // จัดการ 401 Unauthorized (session expiry)
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      
      Alert.alert(
        'เซสชันหมดอายุ',
        'กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
        [{ 
          text: 'ตกลง', 
          onPress: () => {
            // Reset navigation ไปหน้า Login (ลบ history ทั้งหมด)
            navigationService.reset('Login');
          } 
        }]
      );
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

export default apiClient;