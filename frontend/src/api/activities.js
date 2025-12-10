// API client for activities
import apiClient from './client';

export const listActivities = (params) => {
  return apiClient.get('/activities', { params });
};

export const getMonthActivities = (year, month) => {
  return apiClient.get(`/activities/month/${year}/${month}`);
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
