// API client for routine activities
import apiClient from './client';

// List all routine activity templates
export const listRoutineActivities = (params) => {
  return apiClient.get('/routine-activities', { params });
};

// Create new routine activity template
export const createRoutineActivity = (data) => {
  const payload = normalizeRoutinePayload(data);
  console.log('createRoutineActivity payload (normalized):', payload);
  return apiClient.post('/routine-activities', payload).catch((err) => {
    console.error('createRoutineActivity error:', err);
    throw err;
  });
};

// Update routine activity template
export const updateRoutineActivity = (id, data) => {
  const payload = normalizeRoutinePayload(data, /* allowPartial */ true);
  console.log('updateRoutineActivity payload (normalized):', id, payload);
  return apiClient.put(`/routine-activities/${id}`, payload).catch((err) => {
    console.error('updateRoutineActivity error:', err);
    throw err;
  });
};

// Delete routine activity template
export const deleteRoutineActivity = (id) => {
  return apiClient.delete(`/routine-activities/${id}`);
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

  // notes: optional text field
  if (data.notes !== undefined) {
    const n = data.notes === null ? null : String(data.notes).trim();
    out.notes = (n && n.length > 0) ? n : null;
  } else if (!allowPartial) {
    out.notes = null;
  }

  // subtasks: optional array of objects
  if (data.subtasks !== undefined) {
    if (Array.isArray(data.subtasks) && data.subtasks.length > 0) {
      // Filter out empty subtasks and format them
      out.subtasks = data.subtasks
        .filter(st => st && st.text && st.text.trim().length > 0)
        .map(st => ({
          id: st.id || Date.now().toString(),
          text: st.text.trim(),
          completed: st.completed || false
        }));
      if (out.subtasks.length === 0) out.subtasks = null;
    } else {
      out.subtasks = null;
    }
  } else if (!allowPartial) {
    out.subtasks = null;
  }

  return out;
}
