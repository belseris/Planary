import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  StatusBar,
  SafeAreaView
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from '@expo/vector-icons'; // *ต้องมั่นใจว่าลง expo/vector-icons แล้ว

import { loginApi } from "../api";

// --- Theme Colors (คุมโทนเดียวกับ Register) ---
const COLORS = {
  primary: "#1f6f8b",    // สีหลัก
  secondary: "#e6f2f5",  // สีพื้นหลังอ่อนๆ
  text: "#333333",       // สีข้อความ
  textLight: "#888888",  // สีข้อความจาง
  background: "#ffffff", // สีพื้นหลัง
  border: "#dddddd",     // สีเส้นขอบ
  inputBg: "#f9f9f9",    // สีพื้นหลังช่องกรอก
  error: "#ff4d4f"       // สีแจ้งเตือน error
};

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // UX States
  const [loading, setLoading] = useState(false);       // หมุนๆ เวลาโหลด
  const [showPassword, setShowPassword] = useState(false); // เปิด/ปิด รหัสผ่าน

  const onLogin = async () => {
    // 1. Validation เบื้องต้น
    if (!email || !password) {
      Alert.alert("ข้อมูลไม่ครบถ้วน", "กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }

    // 2. เริ่มโหลด
    setLoading(true);

    try {
      // sanitize เบื้องต้น: trim ช่องว่าง และลบอักขระ non-ASCII ในอีเมล
      // (ป้องกันปัญหาคีย์บอร์ดบางรุ่นแทรกอักขระแปลก)
      const trimmedEmail = email.trim().replace(/[^\x00-\x7F]/g, '');
      const trimmedPassword = password.trim();
      
      // เรียก API login แล้วรอ token กลับมา
      const data = await loginApi({ email: trimmedEmail, password: trimmedPassword });
      
      // 3. บันทึก Token (เก็บทั้ง Access และ Refresh เพื่อรองรับระบบใหม่)
      await AsyncStorage.multiSet([
        ["token", data.access_token],
        ["refreshToken", data.refresh_token || ""] // เผื่อ backend เก่ายังไม่ส่งมา
      ]);

      // 4. ไปหน้าหลัก
      navigation.replace("Main");
      
    } catch (e) {
      console.error("Login Error:", e);
      Alert.alert(
        "เข้าสู่ระบบไม่สำเร็จ", 
        "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง"
      );
    } finally {
      // 5. หยุดโหลดเสมอ ไม่ว่าจะสำเร็จหรือไม่
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      {/* แตะพื้นที่ว่างเพื่อหุบคีย์บอร์ด */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          // iOS ใช้ padding, Android ใช้ height เพื่อเลี่ยงคีย์บอร์ดทับฟอร์ม
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
        >
          {/* --- Logo Section --- */}
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Planary</Text>
            <Text style={styles.subtitle}>ไดอารี่ผู้ช่วยในชีวิตประจำวัน</Text>
          </View>

          {/* --- Input Section --- */}
          <View style={styles.formContainer}>
            
            {/* Email Input */}
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="อีเมล"
                placeholderTextColor={COLORS.textLight}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="รหัสผ่าน"
                placeholderTextColor={COLORS.textLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons 
                  name={showPassword ? "eye-outline" : "eye-off-outline"} 
                  size={20} 
                  color={COLORS.textLight} 
                />
              </TouchableOpacity>
            </View>

            {/* Forgot Password (Optional UI) */}
            {/* <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>ลืมรหัสผ่าน?</Text>
            </TouchableOpacity> */}

            {/* Login Button */}
            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={onLogin}
              disabled={loading} // ห้ามกดซ้ำตอนโหลด
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>เข้าสู่ระบบ</Text>
              )}
            </TouchableOpacity>

          </View>

          {/* --- Footer Section --- */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>ยังไม่มีบัญชีใช่ไหม? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
              <Text style={styles.registerLink}>สร้างบัญชีใหม่</Text>
            </TouchableOpacity>
          </View>

        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  // Logo Styles
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  // Form Styles
  formContainer: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    height: 54,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    height: '100%',
  },
  eyeIcon: {
    padding: 8,
  },
  // Button Styles
  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  // Extra Links
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: COLORS.textLight,
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  footerText: {
    color: COLORS.textLight,
    fontSize: 15,
  },
  registerLink: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 15,
  },
});