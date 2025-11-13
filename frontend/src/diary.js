// src/diary.js
import apiClient from './apiClient'; // ✅ 1. เปลี่ยน import มาใช้ apiClient

export function listDiaries({ startDate, endDate }) {
  // ✅ 2. สร้าง object params ให้ axios จัดการ
  const params = {
    start_date: startDate,
    end_date: endDate
  };
  // ✅ 3. ไม่ต้องใช้ async/await หรือ .data
  return apiClient.get('/diary', { params });
}

export function getDiary(id) {
  return apiClient.get(`/diary/${id}`);
}

export function createDiary(payload) {
  return apiClient.post("/diary", payload);
}

export function updateDiary(id, payload) {
  return apiClient.put(`/diary/${id}`, payload);
}

export function deleteDiary(id) {
  return apiClient.delete(`/diary/${id}`);
}