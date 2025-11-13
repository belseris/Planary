// สร้างไฟล์ใหม่ที่: src/apiClient.js

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// ❗️❗️ **สำคัญมาก** ❗️❗️
// 1. ถ้าทดสอบบน Android Emulator (ที่ไม่ใช่ Expo Go) ให้ใช้ 'http://10.0.2.2:8000'
// 2. ถ้าทดสอบบน iOS Simulator ให้ใช้ 'http://127.0.0.1:8000'
// 3. ถ้าทดสอบบนมือถือจริง ให้ใช้ IP Address ของคอมพิวเตอร์คุณ เช่น 'http://192.168.1.10:8000'
export const BASE_URL = 'http://10.0.2.2:8000'; // <--- ❗️ แก้ไข IP นี้ให้ถูกต้อง

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// "ตัวดัก" Request: จะทำงานก่อนส่งทุกคำขอ
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// "ตัวดัก" Response: จะทำงานหลังได้รับทุกการตอบกลับ
apiClient.interceptors.response.use(
  (response) => response.data, // คืนเฉพาะ data กลับไปให้ใช้ง่ายๆ
  async (error) => {
    // ถ้า Token หมดอายุ (401) ให้ออกจากระบบ
    if (error.response?.status === 401) {
      Alert.alert(
        'เซสชันหมดอายุ',
        'กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
        [{ text: 'ตกลง', onPress: async () => {
            await AsyncStorage.removeItem('token');
            // ที่นี่คุณอาจจะต้องใช้ navigation.replace('Login')
            // แต่วิธีที่ซับซ้อนกว่าคือการใช้ NavigationRef
          } 
        }]
      );
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

export default apiClient;