import React, { useState, useEffect, useLayoutEffect } from "react";
import { 
  View, 
  Text, 
  Alert, 
  Image, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from "expo-image-picker";
import { updateProfileApi, changePasswordApi, uploadAvatarApi, BASE_URL } from "../api";

// --- Configuration Colors ---
const COLORS = {
  primary: "#1f6f8b",
  secondary: "#e6f2f5",
  text: "#2D3748",
  textLight: "#718096",
  background: "#f7f9fc",
  card: "#ffffff",
  error: "#e53e3e",
  success: "#38a169",
  border: "#e2e8f0",
  inputBg: "#f7fafc"
};

// --- Component: Custom Input ---
const CustomInput = ({ 
  icon, 
  placeholder, 
  value, 
  onChangeText, 
  secureTextEntry, 
  keyboardType, 
  showPassword, 
  onTogglePassword,
  multiline,
  numberOfLines 
}) => (
  <View style={[styles.inputContainer, multiline && { height: 'auto', paddingVertical: 10, alignItems: 'flex-start' }]}>
    <Ionicons name={icon} size={20} color={COLORS.textLight} style={[styles.inputIcon, multiline && { marginTop: 4 }]} />
    <TextInput
      style={[styles.input, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textLight}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry && !showPassword}
      keyboardType={keyboardType || "default"}
      autoCapitalize="none"
      multiline={multiline}
      numberOfLines={numberOfLines}
    />
    {onTogglePassword && (
      <TouchableOpacity onPress={onTogglePassword} style={styles.eyeIcon}>
        <Ionicons 
          name={showPassword ? "eye-outline" : "eye-off-outline"} 
          size={20} 
          color={COLORS.textLight} 
        />
      </TouchableOpacity>
    )}
  </View>
);

// --- Component: Password Checklist Item ---
const CheckItem = ({ met, text }) => (
  <View style={styles.checkItem}>
    <Ionicons 
      name={met ? "checkmark-circle" : "ellipse-outline"} 
      size={16} 
      color={met ? COLORS.success : COLORS.textLight} 
    />
    <Text style={[styles.checkText, met && styles.checkTextMet]}>{text}</Text>
  </View>
);

export default function EditProfileScreen({ route, navigation }) {
  const { me } = route.params;

  // --- 1. จัดการซ่อน Header ของระบบ เพื่อแก้ปัญหาปุ่มย้อนกลับ 2 อัน ---
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false, 
    });
  }, [navigation]);

  // --- Profile State ---
  // เช็คหลาย key เผื่อ backend ส่งมาชื่ออื่น เช่น bio, description, หรือ signature
  const [username, setUsername] = useState(me?.username || "");
  const [gender, setGender] = useState(me?.gender || "ไม่ระบุ");
  const [age, setAge] = useState(me?.age ? String(me.age) : "");
  const [bio, setBio] = useState(me?.bio || me?.description || me?.signature || ""); 
  const [avatar, setAvatar] = useState(me?.avatar_url ? (me.avatar_url.startsWith('http') ? me.avatar_url : `${BASE_URL}${me.avatar_url}`) : null);
  
  // --- Password State ---
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  
  // --- Loading States ---
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingPw, setLoadingPw] = useState(false);
  const [loadingAvatar, setLoadingAvatar] = useState(false);

  // --- Password Validation ---
  const [pwChecks, setPwChecks] = useState({
    length: false, upper: false, lower: false, digit: false, special: false,
  });

  useEffect(() => {
    if (newPw) {
      setPwChecks({
        length: newPw.length >= 8,
        upper: /[A-Z]/.test(newPw),
        lower: /[a-z]/.test(newPw),
        digit: /\d/.test(newPw),
        special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPw),
      });
    }
  }, [newPw]);

  // --- Handlers ---

  const saveProfile = async () => {
    setLoadingSave(true);
    try {
      const payload = { 
        username, 
        gender, 
        age: age ? Number(age) : null,
        bio // ส่งค่า Bio ที่แก้ไขแล้วไปที่ API
      };
      
      const updatedUser = await updateProfileApi(payload);
      
      Alert.alert("สำเร็จ", "อัปเดตข้อมูลโปรไฟล์เรียบร้อยแล้ว", [
        { 
          text: "ตกลง", 
          onPress: () => {
            // ส่งค่าที่อัปเดตกลับไปหน้าก่อนหน้า (ถ้าหน้า Profile รองรับการรับ params)
            // หรือให้หน้า Profile ทำการ refetch ข้อมูลใหม่เอง
            navigation.goBack(); 
          } 
        }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert("ล้มเหลว", "ไม่สามารถอัปเดตข้อมูลได้: " + (error?.response?.data?.detail || error.message));
    } finally {
      setLoadingSave(false);
    }
  };

  const changePassword = async () => {
    if (!oldPw || !newPw) return Alert.alert("แจ้งเตือน", "กรุณากรอกรหัสผ่านให้ครบถ้วน");
    
    const allOk = Object.values(pwChecks).every(Boolean);
    if (!allOk) {
      return Alert.alert("รหัสผ่านไม่ปลอดภัย", "กรุณาตั้งรหัสผ่านตามเงื่อนไขที่กำหนด");
    }
    
    setLoadingPw(true);
    try {
      await changePasswordApi({ old_password: oldPw, new_password: newPw });
      setOldPw(""); 
      setNewPw("");
      Alert.alert("สำเร็จ", "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว");
    } catch (e) {
      const errorMsg = e?.response?.data?.detail || "รหัสผ่านเดิมไม่ถูกต้อง";
      Alert.alert("ล้มเหลว", errorMsg);
    } finally {
      setLoadingPw(false);
    }
  };

  const pickImage = async () => {
    Alert.alert("เปลี่ยนรูปโปรไฟล์", "เลือกรูปภาพจาก...", [
      { text: "ถ่ายรูปใหม่", onPress: () => handleImagePicker(true) },
      { text: "เลือกจากคลัง", onPress: () => handleImagePicker(false) },
      { text: "ยกเลิก", style: "cancel" }
    ]);
  };

  const handleImagePicker = async (useCamera) => {
    try {
      const permissionMethod = useCamera 
        ? ImagePicker.requestCameraPermissionsAsync 
        : ImagePicker.requestMediaLibraryPermissionsAsync;
      
      const { status } = await permissionMethod();
      if (status !== "granted") {
        return Alert.alert("ต้องการสิทธิ์", `กรุณาอนุญาตให้แอปเข้าถึง${useCamera ? 'กล้อง' : 'คลังรูปภาพ'}`);
      }

      const launchMethod = useCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
      const result = await launchMethod({
        mediaTypes: 'images',
        quality: 0.7,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("ข้อผิดพลาด", error.message);
    }
  };

  const uploadImage = async (uri) => {
    setLoadingAvatar(true);
    try {
      const updated = await uploadAvatarApi(uri);
      const fullUrl = updated.avatar_url.startsWith('http') 
        ? updated.avatar_url 
        : `${BASE_URL}${updated.avatar_url}`;
      setAvatar(fullUrl);
      Alert.alert("สำเร็จ", "อัปโหลดรูปโปรไฟล์แล้ว");
    } catch (e) {
      Alert.alert("ล้มเหลว", "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setLoadingAvatar(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      
      {/* --- Custom Header (ใช้แทนของระบบ) --- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>แก้ไขโปรไฟล์</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* --- Avatar Section --- */}
          <View style={styles.avatarSection}>
            <TouchableOpacity style={styles.avatarWrapper} onPress={pickImage} disabled={loadingAvatar}>
              {loadingAvatar ? (
                 <View style={[styles.avatarPlaceholder, { backgroundColor: '#e1e1e1' }]}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                 </View>
              ) : avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={48} color={COLORS.primary} />
                </View>
              )}
              <View style={styles.cameraButton}>
                <Ionicons name="camera" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>แตะเพื่อเปลี่ยนรูป</Text>
          </View>

          {/* --- Edit Info Card --- */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>ข้อมูลส่วนตัว</Text>
            
            <Text style={styles.label}>ชื่อผู้ใช้</Text>
            <CustomInput 
              icon="person-outline" 
              placeholder="ชื่อที่ใช้แสดง" 
              value={username} 
              onChangeText={setUsername} 
            />

            {/* <Text style={styles.label}>คติประจำใจ (Bio)</Text>
            <CustomInput 
              icon="chatbox-ellipses-outline" 
              placeholder="แนะนำตัวสั้นๆ หรือคำคม..." 
              value={bio} 
              onChangeText={setBio} 
              multiline={true}
              numberOfLines={3}
            /> */}

            <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.label}>เพศ</Text>
                    <View style={styles.genderRow}>
                        <TouchableOpacity 
                            style={[styles.genderChip, gender === 'ชาย' && styles.genderChipSelected]}
                            onPress={() => setGender('ชาย')}
                        >
                            <Ionicons name="male" size={16} color={gender === 'ชาย' ? '#fff' : COLORS.textLight} />
                            <Text style={[styles.genderChipText, gender === 'ชาย' && { color: '#fff' }]}>ชาย</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.genderChip, gender === 'หญิง' && styles.genderChipSelected]}
                            onPress={() => setGender('หญิง')}
                        >
                            <Ionicons name="female" size={16} color={gender === 'หญิง' ? '#fff' : COLORS.textLight} />
                            <Text style={[styles.genderChipText, gender === 'หญิง' && { color: '#fff' }]}>หญิง</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ flex: 0.6 }}>
                    <Text style={styles.label}>อายุ</Text>
                    <CustomInput 
                        icon="calendar-outline" 
                        placeholder="ปี" 
                        value={age} 
                        onChangeText={setAge} 
                        keyboardType="numeric" 
                    />
                </View>
            </View>

            <TouchableOpacity 
                style={styles.primaryButton} 
                onPress={saveProfile}
                disabled={loadingSave}
            >
              {loadingSave ? (
                  <ActivityIndicator color="#fff" />
              ) : (
                  <>
                    <Ionicons name="save-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryButtonText}>บันทึกข้อมูล</Text>
                  </>
              )}
            </TouchableOpacity>
          </View>

          {/* --- Change Password Card --- */}
          <View style={[styles.card, { marginTop: 20 }]}>
            <Text style={styles.sectionTitle}>ความปลอดภัย</Text>
            
            <Text style={styles.label}>รหัสผ่านเดิม</Text>
            <CustomInput 
              icon="lock-closed-outline" 
              placeholder="••••••" 
              value={oldPw} 
              onChangeText={setOldPw} 
              secureTextEntry 
              showPassword={showOldPw}
              onTogglePassword={() => setShowOldPw(!showOldPw)}
            />

            <Text style={styles.label}>รหัสผ่านใหม่</Text>
            <CustomInput 
              icon="lock-closed-outline" 
              placeholder="••••••" 
              value={newPw} 
              onChangeText={setNewPw} 
              secureTextEntry 
              showPassword={showNewPw}
              onTogglePassword={() => setShowNewPw(!showNewPw)}
            />

            {newPw.length > 0 && (
              <View style={styles.checklistContainer}>
                <Text style={styles.checklistTitle}>ความปลอดภัยของรหัสผ่าน:</Text>
                <CheckItem met={pwChecks.length} text="อย่างน้อย 8 ตัวอักษร" />
                <CheckItem met={pwChecks.upper} text="ตัวพิมพ์ใหญ่ (A-Z)" />
                <CheckItem met={pwChecks.lower} text="ตัวพิมพ์เล็ก (a-z)" />
                <CheckItem met={pwChecks.digit} text="ตัวเลข (0-9)" />
                <CheckItem met={pwChecks.special} text="อักขระพิเศษ (!@#...)" />
              </View>
            )}

            <TouchableOpacity 
                style={[styles.secondaryButton, (!oldPw || !newPw) && { opacity: 0.5 }]} 
                onPress={changePassword}
                disabled={loadingPw || !oldPw || !newPw}
            >
               {loadingPw ? (
                  <ActivityIndicator color={COLORS.primary} />
              ) : (
                  <>
                    <Ionicons name="key-outline" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.secondaryButtonText}>เปลี่ยนรหัสผ่าน</Text>
                  </>
              )}
            </TouchableOpacity>
          </View>
          
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  
  // Header
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderBottomColor: '#edf2f7' 
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: COLORS.text },
  backButton: { padding: 8, marginLeft: -8 },

  scrollContent: { padding: 20 },

  // Avatar
  avatarSection: { alignItems: 'center', marginBottom: 25 },
  avatarWrapper: { position: 'relative', marginBottom: 10, shadowColor: COLORS.primary, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#fff' },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#e2e8f0', borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  cameraButton: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  avatarHint: { fontSize: 13, color: COLORS.textLight },

  // Card & Layout
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 15, borderLeftWidth: 3, borderLeftColor: COLORS.primary, paddingLeft: 10 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },

  // Inputs
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textLight, marginBottom: 6, marginTop: 12 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.inputBg, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, height: 48 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: COLORS.text },
  eyeIcon: { padding: 8 },

  // Gender Custom
  genderRow: { flexDirection: 'row', gap: 8 },
  genderChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.border },
  genderChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  genderChipText: { fontSize: 14, fontWeight: '500', color: COLORS.textLight, marginLeft: 6 },

  // Password Check
  checklistContainer: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, marginTop: 15, borderWidth: 1, borderColor: '#edf2f7' },
  checklistTitle: { fontSize: 12, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  checkItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  checkText: { fontSize: 12, color: COLORS.textLight, marginLeft: 6 },
  checkTextMet: { color: COLORS.success, fontWeight: '600' },

  // Buttons
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, marginTop: 25, shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowOffset: {width: 0, height: 4}, elevation: 4 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', paddingVertical: 14, borderRadius: 12, marginTop: 20, borderWidth: 1, borderColor: COLORS.primary },
  secondaryButtonText: { color: COLORS.primary, fontSize: 16, fontWeight: 'bold' },
});