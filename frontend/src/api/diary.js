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

export function listDiaryImages(id) {
  return apiClient.get(`/diary/${id}/images`);
}

export function deleteDiaryImage(id, filename) {
  return apiClient.delete(`/diary/${id}/images/${encodeURIComponent(filename)}`);
}

// Upload images using multipart/form-data (no Base64)
export async function uploadDiaryImages(id, assets) {
  const formData = new FormData();

  assets.forEach((asset, index) => {
    formData.append('files', {
      uri: asset.uri,
      name: asset.fileName || `photo_${Date.now()}_${index}.jpg`,
      type: asset.mimeType || asset.type || 'image/jpeg',
    });
  });

  return apiClient.post(`/diary/${id}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

// Check if diary exists for a specific date (YYYY-MM-DD)
export async function existsDiary(dateISO) {
  const res = await listDiaries({ startDate: dateISO, endDate: dateISO });
  const arr = Array.isArray(res) ? res : res?.items || [];
  return arr.length > 0;
}
