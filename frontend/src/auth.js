import { api, BASE_URL } from "./api";

export async function registerApi(payload) {
  const res = await api.post("/register", payload);
  return res.data;
}
export async function loginApi(payload) {
  const res = await api.post("/login", payload);
  return res.data;
}
export async function meApi() {
  const res = await api.get("/profile/me");
  return res.data;
}
export async function updateProfileApi(payload) {
  const res = await api.put("/profile/update", payload);
  return res.data;
}
export async function changePasswordApi(payload) {
  const res = await api.patch("/profile/password", payload);
  return res.data;
}
export async function uploadAvatarApi(fileUri) {
  const filename = fileUri.split("/").pop();
  const form = new FormData();
  form.append("file", { uri: fileUri, name: filename, type: "image/jpeg" });
  const res = await fetch(`${BASE_URL}/profile/avatar`, {
    method: "POST",
    headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${await AsyncStorage.getItem("token")}` },
    body: form,
  });
  if (!res.ok) throw new Error("อัปโหลดรูปไม่สำเร็จ");
  return await res.json();
}

