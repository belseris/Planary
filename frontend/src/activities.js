// src/activities.js
import apiClient from './apiClient'; // ✅ เปลี่ยนจาก api.js หรือ axios

export const listActivities = (params) => {
  return apiClient.get('/activities', { params });
};

export const createActivity = (data) => {
  return apiClient.post('/activities', data);
};

export const getActivity = (id) => {
  return apiClient.get(`/activities/${id}`);
};

export const updateActivity = (id, data) => {
  return apiClient.put(`/activities/${id}`, data);
};

export const deleteActivity = (id) => {
  return apiClient.delete(`/activities/${id}`);
};