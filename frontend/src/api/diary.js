// API client for diary
import apiClient from './client';

export function listDiaries({ startDate, endDate }) {
  const params = {
    start_date: startDate,
    end_date: endDate
  };
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

// Check if diary exists for a specific date (YYYY-MM-DD)
export async function existsDiary(dateISO) {
  const res = await listDiaries({ startDate: dateISO, endDate: dateISO });
  const arr = Array.isArray(res) ? res : res?.items || [];
  return arr.length > 0;
}
