// src/diary.js

import { api } from "./api"; // << ตรวจสอบ path ไปยังไฟล์ axios instance ของคุณ

export async function listDiaries({ startDate, endDate }) {
  const params = new URLSearchParams();
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);
  const res = await api.get(`/diary?${params.toString()}`);
  return res.data;
}

export async function getDiary(id) {
  const res = await api.get(`/diary/${id}`);
  return res.data;
}

export async function createDiary(payload) {
  const res = await api.post("/diary", payload);
  return res.data;
}

export async function updateDiary(id, payload) {
  const res = await api.put(`/diary/${id}`, payload);
  return res.data;
}

export async function deleteDiary(id) {
  await api.delete(`/diary/${id}`);
}