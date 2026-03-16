/**
 * src/api/auth.js
 * Authentication API Endpoints
 * 
 * ฟังก์ชันสำหรับ:
 * - Login (รับ JWT token)
 * - Register (สมัครสมาชิกใหม่)
 * - Get current user profile
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient, { BASE_URL } from './client';

/**
 * loginApi - เข้าสู่ระบบ
 * 
 * @param {Object} credentials - { email, password }
 * @returns {Promise<Object>} { access_token, token_type: "bearer" }
 * 
 * หมายเหตุ: ใช้ axios โดยตรง (ไม่ใช้ apiClient) เพราะยังไม่มี token
 */
export const loginApi = async (credentials) => {
  try {
    const response = await axios.post(`${BASE_URL}/login/token`, {
      email: credentials.email,
      password: credentials.password,
    });
    return response.data;
  } catch (error) {
    console.error('[Auth] Login error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
};

/**
 * registerApi - ลงทะเบียนผู้ใช้ใหม่
 * 
 * @param {Object} credentials - { email, username, password, confirm_password, gender, age }
 * @returns {Promise<Object>} ข้อมูลผู้ใช้ที่สร้างแล้ว
 * 
 * หมายเหตุ: 
 * - age จะถูก convert เป็น integer
 * - รองรับทั้ง confirm_password และ confirmPassword (camelCase)
 */
export const registerApi = async (credentials) => {
  try {
    const payload = {
      email: credentials.email,
      username: credentials.username,
      password: credentials.password,
      confirm_password: credentials.confirm_password || credentials.confirmPassword,
      gender: credentials.gender,
      age: parseInt(credentials.age) || null,
    };
    const response = await axios.post(`${BASE_URL}/register`, payload);
    return response.data;
  } catch (error) {
    console.error('[Auth] Register error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
};

/**
 * meApi - ดึงข้อมูลโปรไฟล์ผู้ใช้ปัจจุบัน
 * 
 * @returns {Promise<Object>} { id, email, username, gender, age, avatar_url }
 * 
 * หมายเหตุ: ใช้ apiClient (มี JWT token auto-attach)
 */
export const meApi = async () => {
  try {
    const data = await apiClient.get('/profile/me');
    return data;
  } catch (error) {
    console.error('[Auth] meApi error:', {
      message: error?.message,
      response: error?.response || error,
    });
    throw error;
  }
};

/**
 * updateProfileApi - อัปเดตข้อมูลโปรไฟล์ผู้ใช้
 * 
 * @param {Object} profileData - { username, gender, age }
 * @returns {Promise<Object>} ข้อมูลโปรไฟล์ที่อัปเดตแล้ว
 */
export const updateProfileApi = async (profileData) => {
  try {
    const data = await apiClient.put('/profile/update', profileData);
    return data;
  } catch (error) {
    console.error('[Auth] updateProfileApi error:', {
      message: error?.message,
      response: error?.response || error,
    });
    throw error;
  }
};

/**
 * changePasswordApi - เปลี่ยนรหัสผ่าน
 * 
 * @param {Object} passwords - { old_password, new_password }
 * @returns {Promise<Object>} ผลลัพธ์การเปลี่ยนรหัสผ่าน
 */
export const changePasswordApi = async (passwords) => {
  try {
    const data = await apiClient.patch('/profile/password', passwords);
    return data;
  } catch (error) {
    console.error('[Auth] changePasswordApi error:', {
      message: error?.message,
      response: error?.response || error,
    });
    throw error;
  }
};

/**
 * uploadAvatarApi - อัปโหลดรูปโปรไฟล์
 * 
 * @param {string} uri - URI ของรูปภาพที่จะอัปโหลด
 * @returns {Promise<Object>} { avatar_url }
 */
export const uploadAvatarApi = async (uri) => {
  try {
    const formData = new FormData();
    const filename = uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
      uri,
      name: filename,
      type,
    });

    // ใช้ axios โดยตรงเพราะ FormData ต้องการ config พิเศษ
    const token = await AsyncStorage.getItem('token');

    const response = await axios.post(`${BASE_URL}/profile/avatar`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('[Auth] uploadAvatarApi error:', {
      message: error?.message,
      response: error?.response?.data || error?.response || error,
    });
    throw error;
  }
};

/**
 * deleteAccountApi - ลบบัญชีผู้ใช้ถาวร
 * 
 * @returns {Promise<Object>} { detail: "ลบบัญชีเสร็จสิ้น" }
 */
export const deleteAccountApi = async () => {
  try {
    const data = await apiClient.delete('/profile/account');
    return data;
  } catch (error) {
    console.error('[Auth] deleteAccountApi error:', {
      message: error?.message,
      response: error?.response || error,
    });
    throw error;
  }
};
