import React, { useState } from "react";
import { View, Text, Button, Alert, TouchableOpacity, StyleSheet, Image, ScrollView } from "react-native";
import TextInputField from "../components/TextInputField";
import { registerApi } from "../auth";

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [gender, setGender] = useState(""); // --- แก้ไข: เริ่มต้นเป็นค่าว่าง
  const [age, setAge] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const onRegister = async () => {
    // --- เพิ่ม: ตรวจสอบว่าเลือกเพศแล้วหรือยัง ---
    if (!gender) {
      Alert.alert("ข้อมูลไม่ครบถ้วน", "กรุณาเลือกเพศ");
      return;
    }
    if (password !== confirm) {
      Alert.alert("ผิดพลาด", "รหัสผ่านไม่ตรงกัน");
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
      Alert.alert("สำเร็จ", "ลงทะเบียนเรียบร้อยแล้ว\nกรุณาเข้าสู่ระบบ");
      navigation.replace("Login");
    } catch (e) {
      Alert.alert("ลงทะเบียนไม่สำเร็จ", "กรุณาตรวจสอบข้อมูลและลองอีกครั้ง");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image
        source={require("../assets/logo.png")}
        style={styles.logo}
      />
      <Text style={styles.title}>สร้างบัญชี</Text>
      <View style={styles.inputContainer}>
        <TextInputField label="อีเมล" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <View style={styles.spacer} />
        <TextInputField label="ชื่อผู้ใช้" value={username} onChangeText={setUsername} />
        <View style={styles.spacer} />

        {/* --- ใหม่: ส่วนของการเลือกเพศ --- */}
        <Text style={styles.label}>เพศ</Text>
        <View style={styles.genderContainer}>
          <TouchableOpacity
            style={[
              styles.genderButton,
              styles.genderButtonLeft,
              gender === 'ชาย' ? styles.genderButtonSelected : {}
            ]}
            onPress={() => setGender('ชาย')}
          >
            <Text style={[styles.genderText, gender === 'ชาย' ? styles.genderTextSelected : {}]}>ชาย</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.genderButton,
              styles.genderButtonRight,
              gender === 'หญิง' ? styles.genderButtonSelected : {}
            ]}
            onPress={() => setGender('หญิง')}
          >
            <Text style={[styles.genderText, gender === 'หญิง' ? styles.genderTextSelected : {}]}>หญิง</Text>
          </TouchableOpacity>
        </View>
        {/* --- สิ้นสุดส่วนเลือกเพศ --- */}

        <TextInputField label="อายุ" value={age} onChangeText={setAge} keyboardType="numeric" />
        <View style={styles.spacer} />
        <TextInputField label="รหัสผ่าน" value={password} onChangeText={setPassword} secureTextEntry />
        <View style={styles.spacer} />
        <TextInputField label="ยืนยันรหัสผ่าน" value={confirm} onChangeText={setConfirm} secureTextEntry />
        <View style={{ height: 20 }} />
        <Button title="ลงทะเบียน" onPress={onRegister} />
      </View>

      <TouchableOpacity onPress={() => navigation.replace("Login")} style={styles.loginButton}>
        <Text style={styles.loginText}>กลับไปหน้าเข้าสู่ระบบ</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
  },
  inputContainer: {
    width: '100%',
  },
  spacer: {
    height: 12,
  },
  loginButton: {
    marginTop: 16,
    paddingBottom: 20, // เพิ่มระยะห่างด้านล่าง
  },
  loginText: {
    textAlign: "center",
    color: '#1f6f8b'
  },
  // --- สไตล์สำหรับส่วนเลือกเพศ ---
  label: {
    color: '#555',
    marginBottom: 8,
    marginLeft: 4,
    fontSize: 16
  },
  genderContainer: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 12,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  genderButtonLeft: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  genderButtonRight: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    marginLeft: -1, // ทำให้เส้นขอบติดกัน
  },
  genderButtonSelected: {
    backgroundColor: '#1f6f8b',
    borderColor: '#1f6f8b',
  },
  genderText: {
    color: '#333',
    fontWeight: '500',
  },
  genderTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
});

