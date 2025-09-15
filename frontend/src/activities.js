import { api } from "./api";

export async function listActivities(params = {}) {
  const res = await api.get("/activities", { params });
  return res.data;
}

export async function getActivity(id) {
  const res = await api.get(`/activities/${id}`);
  return res.data;
}

export async function createActivity(payload) {
  const res = await api.post("/activities", payload);
  return res.data;
}

export async function updateActivity(id, payload) {
  const res = await api.put(`/activities/${id}`, payload);
  return res.data;
}

export async function deleteActivity(id) {
  await api.delete(`/activities/${id}`);
}
