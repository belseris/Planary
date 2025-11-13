// src/api/api.js

import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Choose a sensible default BASE_URL depending on environment:
// - Android emulator (AVD) should use 10.0.2.2 to reach host loopback
// - Other devices (iOS simulator / physical device) typically use the machine LAN IP
const DEFAULT_LAN_IP = "192.168.0.100"; // replace with your machine IP from ipconfig if different
export const BASE_URL = Platform.OS === "android" ? `http://10.0.2.2:8000` : `http://${DEFAULT_LAN_IP}:8000`;
export const api = axios.create({ baseURL: BASE_URL, timeout: 15000 });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});