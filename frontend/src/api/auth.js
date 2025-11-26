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
