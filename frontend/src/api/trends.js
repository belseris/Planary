/**
 * trends.js - API functions สำหรับหน้า Dashboard/Trends
 * 
 * Endpoints:
 * - GET /trends/mood - แนวโน้มอารมณ์
 * - GET /trends/mood-factors - ปัจจัยที่ส่งผลต่ออารมณ์
 * - GET /trends/completion - สรุปความสำเร็จ
 * - GET /trends/life-balance - สมดุลชีวิต
 * - GET /trends/summary - ข้อมูลทั้งหมด (เรียกครั้งเดียว)
 */

import apiClient from './client';

/**
 * ดึงข้อมูลแนวโน้มอารมณ์
 * @param {string} period - 'week' | 'month' | 'year'
 * @returns {Promise<Object>} { data: [{date, score}], average, trend }
 */
export async function getMoodTrend(period = 'week') {
  // apiClient มี interceptor ที่ return response.data อยู่แล้ว
  return await apiClient.get(`/trends/mood?period=${period}`);
}

/**
 * ดึงข้อมูลปัจจัยที่ส่งผลต่ออารมณ์
 * @param {string} period - 'week' | 'month' | 'year'
 * @returns {Promise<Object>} { positive: [], negative: [], neutral: [] }
 */
export async function getMoodFactors(period = 'week') {
  return await apiClient.get(`/trends/mood-factors?period=${period}`);
}

/**
 * ดึงข้อมูลสรุปความสำเร็จของกิจกรรม
 * @param {string} period - 'week' | 'month' | 'year'
 * @returns {Promise<Object>} { total, completed, completion_rate, data: [] }
 */
export async function getCompletionRate(period = 'week') {
  return await apiClient.get(`/trends/completion?period=${period}`);
}

/**
 * ดึงข้อมูลสมดุลชีวิตตามหมวดหมู่
 * @param {string} period - 'week' | 'month' | 'year'
 * @returns {Promise<Object>} { total, data: [], warning }
 */
export async function getLifeBalance(period = 'week') {
  return await apiClient.get(`/trends/life-balance?period=${period}`);
}

/**
 * ดึงข้อมูลทั้งหมดสำหรับ Dashboard (เรียกครั้งเดียว - แนะนำ)
 * @param {string} period - 'week' | 'month'
 * @param {number} offset - ย้อนหลัง (0=ปัจจุบัน, -1=ช่วงที่แล้ว, -2=2 ช่วงก่อน)
 * @returns {Promise<Object>} { mood, mood_factors, completion, life_balance }
 */
export async function getDashboardSummary(period = 'week', offset = 0) {
  // apiClient มี interceptor ที่ return response.data อยู่แล้ว ไม่ต้อง .data อีกรอบ
  return await apiClient.get(`/trends/summary?period=${period}&offset=${offset}`);
}
