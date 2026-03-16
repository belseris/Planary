import React from "react";
import { TextInput, View, Text } from "react-native";

// TextInputField = input มาตรฐานของแอป
// รับ label + value + onChangeText และ option ของ input (เช่น password, keyboard)
export default function TextInputField({ label, value, onChangeText, secureTextEntry, keyboardType }) {
  return (
    <View style={{ marginBottom: 12 }}>
      {/* ป้ายกำกับช่องกรอก */}
      <Text style={{ marginBottom: 6 }}>{label}</Text>
      <TextInput
        value={value}
        // controlled input: parent เป็นคนเก็บ state จริง
        onChangeText={onChangeText}
        // ใช้ซ่อนข้อความเมื่อเป็นรหัสผ่าน
        secureTextEntry={secureTextEntry}
        // กำหนดชนิดคีย์บอร์ด เช่น default / email-address / numeric
        keyboardType={keyboardType}
        style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10 }}
      />
    </View>
  );
}
