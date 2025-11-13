// src/auth.js
import axios from 'axios';
import apiClient, { BASE_URL } from './apiClient';

export const loginApi = async (credentials) => {
  try {
    const response = await axios.post(`${BASE_URL}/login/token`, {
      email: credentials.email,
      password: credentials.password,
    });
    return response.data;
  } catch (error) {
    console.error("Login error full:", {
      message: error.message,
      code: error.code,
      request: error.request,
      response: error.response?.data,
      status: error.response?.status,
    });
    // rethrow original error so caller can inspect response/request
    throw error;
  }
};

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
    console.log("Register payload:", payload);
    const response = await axios.post(`${BASE_URL}/register`, payload);
    return response.data;
  } catch (error) {
      console.error("Register error full:", {
        message: error.message,
        code: error.code,
        request: error.request,
        response: error.response?.data,
        status: error.response?.status,
      });
      // rethrow original error so caller can inspect response/request
      throw error;
  }
};

// ดึงข้อมูลผู้ใช้ปัจจุบัน (ใช้สำหรับหน้า Profile)
export const meApi = async () => {
  try {
    // apiClient จะใส่ Authorization header ให้จาก AsyncStorage
    const data = await apiClient.get('/profile/me');
    return data;
  } catch (error) {
    console.error('meApi error full:', {
      message: error?.message,
      response: error?.response || error,
    });
    throw error;
  }
};