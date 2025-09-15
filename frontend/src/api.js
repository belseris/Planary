import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const BASE_URL = "http://10.0.2.2:8000";

export const api = axios.create({ baseURL: BASE_URL, timeout: 15000 });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
