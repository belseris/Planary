import React, { useState } from "react";
import { View, Text, Button, Alert, TouchableOpacity, Image, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import TextInputField from "../components/TextInputField";
import { loginApi } from "../auth";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onLogin = async () => {
    try {
      const data = await loginApi({ email, password });
      await AsyncStorage.setItem("token", data.access_token);
      navigation.replace("Main");
    } catch (e) {
      Alert.alert("เข้าสู่ระบบไม่สำเร็จ", "ตรวจสอบอีเมล/รหัสผ่าน");
    }
  };

  return (
    <View style={styles.container}>
      {/* --- เพิ่ม: แสดงโลโก้ --- */}
      <Image
        source={require("../assets/logo.png")} // ตรวจสอบให้แน่ใจว่า path ถูกต้อง
        style={styles.logo}
      />

      <Text style={styles.title}>เข้าสู่ระบบ</Text>

      {/* --- จัดกลุ่ม Input Fields และ Buttons --- */}
      <View style={styles.inputContainer}>
        <TextInputField label="อีเมล" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <View style={{ height: 12 }} /> 
        <TextInputField label="รหัสผ่าน" value={password} onChangeText={setPassword} secureTextEntry />
        <View style={{ height: 20 }} />
        <Button title="เข้าสู่ระบบ" onPress={onLogin} />
      </View>

      <TouchableOpacity onPress={() => navigation.navigate("Register")} style={styles.registerButton}>
        <Text style={styles.registerText}>สร้างบัญชี</Text>
      </TouchableOpacity>
    </View>
  );
}

// --- เพิ่ม: Stylesheet เพื่อความเป็นระเบียบ ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center", // จัดให้อยู่กลางแนวนอน
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24, // ระยะห่างใต้โลโก้
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 24,
  },
  inputContainer: {
    width: '100%', // ทำให้ input เต็มความกว้าง
  },
  registerButton: {
    marginTop: 16,
  },
  registerText: {
    textAlign: "center",
    color: '#1f6f8b' // เปลี่ยนสีให้ดูน่ากดขึ้น (optional)
  }
});