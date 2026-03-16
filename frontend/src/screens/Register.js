import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar
} from "react-native";
import { Ionicons } from '@expo/vector-icons'; // *จำเป็น: ตรวจสอบว่าโปรเจกต์ลง expo/vector-icons แล้ว
// หรือถ้าไม่ได้ใช้ Expo ให้เปลี่ยนไปใช้ Icon library ที่คุณมี หรือลบส่วน Icon ออก

import { registerApi } from "../api";

// --- Configuration Colors ---
const COLORS = {
  primary: "#1f6f8b",
  secondary: "#e6f2f5",
  text: "#333333",
  textLight: "#888888",
  background: "#ffffff",
  error: "#ff4d4f",
  success: "#52c41a",
  border: "#dddddd",
  inputBg: "#f9f9f9"
};

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [gender, setGender] = useState(""); // เริ่มต้นเป็นว่าง เพื่อบังคับให้ผู้ใช้เลือก
  const [age, setAge] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  
  // UX: State สำหรับเปิด/ปิด รหัสผ่าน
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [pwChecks, setPwChecks] = useState({
    length: false,
    upper: false,
    lower: false,
    digit: false,
    special: false,
  });

  useEffect(() => {
    const length = password.length >= 8;
    const upper = /[A-Z]/.test(password);
    const lower = /[a-z]/.test(password);
    const digit = /\d/.test(password);
    const special = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
    setPwChecks({ length, upper, lower, digit, special });
  }, [password]);

  const onRegister = async () => {
    if (!email || !username || !password || !confirm) {
      Alert.alert("แจ้งเตือน", "กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }
    if (!gender) {
      Alert.alert("ข้อมูลไม่ครบถ้วน", "กรุณาระบุเพศของคุณ");
      return;
    }
    if (!age || Number(age) < 1 || Number(age) > 120) {
      Alert.alert("ข้อมูลไม่ถูกต้อง", "กรุณาระบุอายุให้ถูกต้อง (1-120 ปี)");
      return;
    }
    if (password !== confirm) {
      Alert.alert("รหัสผ่านไม่ตรงกัน", "กรุณาตรวจสอบรหัสผ่านอีกครั้ง");
      return;
    }
    
    const allOk = Object.values(pwChecks).every(Boolean);
    if (!allOk) {
      Alert.alert("ความปลอดภัยต่ำ", "รหัสผ่านต้องมีความยาว 8 ตัวอักษรและประกอบด้วย ตัวใหญ่, ตัวเล็ก, ตัวเลข และอักขระพิเศษ");
      return;
    }

    try {
      await registerApi({
        email,
        username,
        gender,
        age: Number(age),
        password,
        confirm_password: confirm,
      });
      
      Alert.alert("ลงทะเบียนสำเร็จ", "ยินดีต้อนรับสู่แอปพลิเคชัน", [
        { text: "เข้าสู่ระบบ", onPress: () => navigation.replace("Login") }
      ]);
    } catch (e) {
      console.error("Register error:", e);
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail;

      if (status === 409 && detail === "อีเมลนี้ถูกใช้แล้ว") {
        Alert.alert("ลงทะเบียนไม่สำเร็จ", "อีเมลนี้ถูกใช้แล้ว");
      } else {
        const errorMsg = detail || e?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
        Alert.alert("ลงทะเบียนไม่สำเร็จ", errorMsg);
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          showsVerticalScrollIndicator={false}
        >
          {/* --- Header Section --- */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>สร้างบัญชีใหม่</Text>
            <Text style={styles.headerSubtitle}>กรอกข้อมูลเพื่อเริ่มต้นใช้งาน</Text>
          </View>

          {/* --- Form Section --- */}
          <View style={styles.formContainer}>
            
            {/* 1. Email & Username */}
            <CustomInput 
              icon="mail-outline" 
              placeholder="อีเมล" 
              value={email} 
              onChangeText={setEmail} 
              keyboardType="email-address"
            />
            <CustomInput 
              icon="person-outline" 
              placeholder="ชื่อผู้ใช้" 
              value={username} 
              onChangeText={setUsername} 
            />

            {/* 2. Gender & Age Group */}
            <View style={styles.rowContainer}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>เพศ</Text>
                <View style={styles.genderContainer}>
                  <GenderOption 
                    label="ชาย" 
                    value="ชาย" 
                    selected={gender} 
                    onSelect={setGender} 
                  />
                  <GenderOption 
                    label="หญิง" 
                    value="หญิง" 
                    selected={gender} 
                    onSelect={setGender} 
                  />
                </View>
              </View>

              <View style={{ flex: 0.6 }}>
                <Text style={styles.label}>อายุ</Text>
                <View style={styles.ageInputWrapper}>
                  <TextInput
                    style={styles.ageInput}
                    value={age}
                    onChangeText={setAge}
                    keyboardType="numeric"
                    placeholder=""
                    maxLength={3}
                  />
                </View>
              </View>
            </View>

            {/* 3. Password Section */}
            <View style={styles.divider} />
            
            <CustomInput 
              icon="lock-closed-outline" 
              placeholder="รหัสผ่าน" 
              value={password} 
              onChangeText={setPassword} 
              secureTextEntry={!showPassword}
              isPassword
              onTogglePass={() => setShowPassword(!showPassword)}
            />

            {/* Password Strength Checklist (Grid Layout) */}
            <View style={styles.checklistContainer}>
              <ChecklistItem passed={pwChecks.length} text="8+ ตัวอักษร" />
              <ChecklistItem passed={pwChecks.upper} text="ตัวพิมพ์ใหญ่ (A-Z)" />
              <ChecklistItem passed={pwChecks.lower} text="ตัวพิมพ์เล็ก (a-z)" />
              <ChecklistItem passed={pwChecks.digit} text="ตัวเลข (0-9)" />
              <ChecklistItem passed={pwChecks.special} text="อักขระพิเศษ (!@#)" />
            </View>

            <CustomInput 
              icon="shield-checkmark-outline" 
              placeholder="ยืนยันรหัสผ่าน" 
              value={confirm} 
              onChangeText={setConfirm} 
              secureTextEntry={!showConfirm}
              isPassword
              onTogglePass={() => setShowConfirm(!showConfirm)}
            />

            {/* --- Action Buttons --- */}
            <TouchableOpacity style={styles.registerButton} onPress={onRegister} activeOpacity={0.8}>
              <Text style={styles.registerButtonText}>ลงทะเบียน</Text>
            </TouchableOpacity>

            <View style={styles.loginLinkContainer}>
              <Text style={styles.loginLinkText}>มีบัญชีอยู่แล้ว? </Text>
              <TouchableOpacity onPress={() => navigation.replace("Login")}>
                <Text style={[styles.loginLinkText, styles.loginLinkHighlight]}>เข้าสู่ระบบ</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- Custom Components เพื่อความสะอาดของโค้ด ---

// 1. ช่องกรอกข้อมูลสวยๆ
const CustomInput = ({ icon, isPassword, onTogglePass, ...props }) => (
  <View style={styles.inputWrapper}>
    <View style={styles.inputIcon}>
      <Ionicons name={icon} size={20} color={COLORS.textLight} />
    </View>
    <TextInput 
      style={styles.inputField} 
      placeholderTextColor={COLORS.textLight}
      {...props} 
    />
    {isPassword && (
      <TouchableOpacity onPress={onTogglePass} style={styles.eyeIcon}>
        <Ionicons name={props.secureTextEntry ? "eye-off-outline" : "eye-outline"} size={20} color={COLORS.textLight} />
      </TouchableOpacity>
    )}
  </View>
);

// 2. ตัวเลือกเพศ
const GenderOption = ({ label, value, selected, onSelect }) => {
  const isSelected = selected === value;
  return (
    <TouchableOpacity 
      style={[
        styles.genderButton, 
        isSelected && styles.genderButtonSelected
      ]} 
      onPress={() => onSelect(value)}
      activeOpacity={0.7}
    >
      <Ionicons 
        name={value === "ชาย" ? "male" : "female"} 
        size={18} 
        color={isSelected ? "#fff" : COLORS.textLight} 
        style={{ marginRight: 4 }}
      />
      <Text style={[styles.genderText, isSelected && styles.genderTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

// 3. รายการตรวจสอบรหัสผ่าน
const ChecklistItem = ({ passed, text }) => (
  <View style={styles.checkItem}>
    <Ionicons 
      name={passed ? "checkmark-circle" : "ellipse-outline"} 
      size={16} 
      color={passed ? COLORS.success : COLORS.textLight} 
    />
    <Text style={[styles.checkText, passed && { color: COLORS.success, fontWeight: '600' }]}>
      {text}
    </Text>
  </View>
);

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    marginTop: 20,
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  formContainer: {
    width: '100%',
  },
  // Input Styles
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
  inputField: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    height: '100%',
  },
  eyeIcon: {
    padding: 8,
  },
  // Row & Gender
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: 8,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  genderButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genderText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  genderTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  // Age Input
  ageInputWrapper: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 48,
    justifyContent: 'center',
  },
  ageInput: {
    textAlign: 'center',
    fontSize: 16,
    color: COLORS.text,
  },
  // Divider
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 10,
    marginBottom: 20,
  },
  // Checklist
  checklistContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    marginTop: -8,
  },
  checkItem: {
    width: '50%', // 2 columns
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  checkText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: 6,
  },
  // Buttons
  registerButton: {
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
  registerButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginLinkText: {
    fontSize: 15,
    color: COLORS.textLight,
  },
  loginLinkHighlight: {
    color: COLORS.primary,
    fontWeight: 'bold',
  }
});