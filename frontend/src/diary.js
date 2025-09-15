import { api } from "./api";

export async function listDiaries({ limit = 50, offset = 0 } = {}) {
  const res = await api.get("/home/diaries", { params: { limit, offset } });
  return res.data; 
}

export async function createDiary(payload) {
  const res = await api.post("/diary", payload);
  return res.data;
}

export async function getDiary(id) {
  const res = await api.get(`/diary/${id}`);
  return res.data;
}

export async function updateDiary(id, payload) {
  const res = await api.put(`/diary/${id}`, payload);
  return res.data;
}

export async function deleteDiary(id) {
  await api.delete(`/home/diaries/${id}`);
}