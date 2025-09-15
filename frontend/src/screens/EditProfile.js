import React, { useState } from "react";
import { View, Text, Button, Alert, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import TextInputField from "../components/TextInputField";
import { updateProfileApi, changePasswordApi, uploadAvatarApi } from "../auth";
import { BASE_URL } from "../api";

export default function EditProfileScreen({ route, navigation }) {
  const { me } = route.params;
  const [username, setUsername] = useState(me.username);
  const [gender, setGender] = useState(me.gender);
  const [age, setAge] = useState(String(me.age));
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [avatar, setAvatar] = useState(me.avatar_url ? `${BASE_URL}${me.avatar_url}` : null);

  const saveProfile = async () => {
    try {
      await updateProfileApi({ username, gender, age: Number(age) });
      Alert.alert("สำเร็จ", "อัปเดตโปรไฟล์แล้ว");
      navigation.goBack();
    } catch {
      Alert.alert("ล้มเหลว", "อัปเดตโปรไฟล์ไม่สำเร็จ");
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return Alert.alert("ต้องการสิทธิ์เข้าถึงรูปภาพ");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled) {
      try {
        const updated = await uploadAvatarApi(result.assets[0].uri);
        setAvatar(`${BASE_URL}${updated.avatar_url}`);
        Alert.alert("สำเร็จ", "อัปโหลดรูปแล้ว");
      } catch {
        Alert.alert("ล้มเหลว", "อัปโหลดรูปไม่สำเร็จ");
      }
    }
  };

  const changePassword = async () => {
    if (!oldPw || !newPw) return Alert.alert("โปรดกรอกข้อมูลรหัสผ่านให้ครบ");
    try {
      await changePasswordApi({ old_password: oldPw, new_password: newPw });
      setOldPw(""); setNewPw("");
      Alert.alert("สำเร็จ", "เปลี่ยนรหัสผ่านแล้ว");
    } catch {
      Alert.alert("ล้มเหลว", "รหัสผ่านเดิมไม่ถูกต้องหรือมีข้อผิดพลาด");
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      {avatar ? (
        <Image source={{ uri: avatar }} style={{ width: 120, height: 120, borderRadius: 60, marginBottom: 12 }} />
      ) : (
        <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: "#ddd", marginBottom: 12 }} />
      )}
      <Button title="เปลี่ยนรูปโปรไฟล์" onPress={pickImage} />

      <View style={{ height: 16 }} />
      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 8 }}>ข้อมูลผู้ใช้</Text>
      <TextInputField label="ชื่อผู้ใช้" value={username} onChangeText={setUsername} />
      <TextInputField label="เพศ (ชาย/หญิง)" value={gender} onChangeText={setGender} />
      <TextInputField label="อายุ" value={age} onChangeText={setAge} keyboardType="numeric" />
      <Button title="บันทึกโปรไฟล์" onPress={saveProfile} />

      <View style={{ height: 24 }} />
      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 8 }}>เปลี่ยนรหัสผ่าน</Text>
      <TextInputField label="รหัสผ่านเดิม" value={oldPw} onChangeText={setOldPw} secureTextEntry />
      <TextInputField label="รหัสผ่านใหม่" value={newPw} onChangeText={setNewPw} secureTextEntry />
      <Button title="เปลี่ยนรหัสผ่าน" onPress={changePassword} />
    </View>
  );
}
