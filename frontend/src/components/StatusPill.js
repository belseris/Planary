import React from "react";
import { View, Text } from "react-native";

const MAP = {
  normal: { bg: "#d9d9d9", fg: "#333", label: "ปกติ" },
  warning: { bg: "#faad14", fg: "#000", label: "กำลังเริ่ม" },
  success: { bg: "#52c41a", fg: "#fff", label: "สมบูรณ์" },
  danger: { bg: "#ff4d4f", fg: "#fff", label: "หมดเวลา" },
};

export default function StatusPill({ status = "normal" }) {
  const s = MAP[status] || MAP.normal;
  return (
    <View style={{ backgroundColor: s.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
      <Text style={{ color: s.fg, fontSize: 12 }}>{s.label}</Text>
    </View>
  );
}
