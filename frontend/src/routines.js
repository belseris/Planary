// สร้างไฟล์ใหม่ที่: src/routines.js

import apiClient from './apiClient';

// ดึง "แม่แบบ" ทั้งหมด (สำหรับหน้า Profile)
export const listRoutineActivities = (params) => {
  // params อาจจะเป็น { day_of_week: 'mon' } หรือไม่ส่งเลยก็ได้
  return apiClient.get('/routine-activities', { params });
};

// สร้าง "แม่แบบ" ใหม่
export const createRoutineActivity = (data) => {
  const payload = normalizeRoutinePayload(data);
  console.log('createRoutineActivity payload (normalized):', payload);
  return apiClient.post('/routine-activities', payload).catch((err) => {
    console.error('createRoutineActivity error:', err);
    throw err;
  });
};

// อัปเดต "แม่แบบ"
export const updateRoutineActivity = (id, data) => {
  const payload = normalizeRoutinePayload(data, /* allowPartial */ true);
  console.log('updateRoutineActivity payload (normalized):', id, payload);
  return apiClient.put(`/routine-activities/${id}`, payload).catch((err) => {
    console.error('updateRoutineActivity error:', err);
    throw err;
  });
};

// Normalize payload to match backend Pydantic schema exactly.
// If allowPartial is true, we omit undefined/null fields so updates can be partial.
export function normalizeRoutinePayload(data = {}, allowPartial = false) {
  const out = {};
  // title: required on create, optional on update (if allowPartial)
  if (data.title !== undefined && data.title !== null) {
    const t = String(data.title || '').trim();
    if (!allowPartial || t.length > 0) out.title = t;
  } else if (!allowPartial) {
    out.title = '';
  }

  // category: optional, send null or string
  if (data.category !== undefined) {
    out.category = data.category === null ? null : String(data.category);
  } else if (!allowPartial) {
    out.category = null;
  }

  // time: convert 'HH:MM' or 'HH:MM:SS' to 'HH:MM:SS', send null if falsy
  if (data.time !== undefined) {
    if (data.time === null || data.time === '') {
      out.time = null;
    } else {
      const s = String(data.time);
      // if already HH:MM:SS keep, if HH:MM add :00
      out.time = s.length === 5 && s[2] === ':' ? `${s}:00` : s;
    }
  } else if (!allowPartial) {
    out.time = null;
  }

  // day_of_week: required on create, optional on update
  if (data.day_of_week !== undefined) {
    out.day_of_week = data.day_of_week === null ? null : String(data.day_of_week);
  } else if (!allowPartial) {
    out.day_of_week = null;
  }

  return out;
}

// ลบ "แม่แบบ"
export const deleteRoutineActivity = (id) => {
  return apiClient.delete(`/routine-activities/${id}`);
};