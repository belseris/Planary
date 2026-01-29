/**
 * Profile.js - หน้าจอโปรไฟล์ (Profile Screen)
 * 
 * หน้าที่หลัก:
 * - แสดงข้อมูล user (username, email, gender, age, avatar)
 * - แสดงรายการ "แม่แบบกิจกรรมประจำ" (Routine Activities) จัดกลุ่มตามวัน
 * - มี Week Selector เพื่อดูแม่แบบของแต่ละวัน
 * - ปุ่มแก้ไขโปรไฟล์ (navigate ไป EditProfile)
 * - ปุ่ม Logout
 * - ปุ่ม + สร้างแม่แบบใหม่ (navigate ไป EditRoutine mode=create)
 * 
 * Components:
 * - useWeek: Hook สำหรับคำนวณวันในสัปดาห์
 * - WeekSelector: Component แสดงปุ่มเลือกวัน (จันทร์-อาทิตย์)
 * - ProfileRoutineCard: การ์ดแสดงแม่แบบกิจกรรม 1 รายการ
 * - ProfileScreen: main component (มี header, avatar, routine list)
 * 
 * Data Flow:
 * 1. เรียก GET /profile/me เพื่อดึงข้อมูล user
 * 2. เรียก GET /routine-activities?day_of_week=... เพื่อดึงแม่แบบของวันที่เลือก
 * 3. แสดงผลในรูปแบบ ScrollView พร้อม cards
 */

// screens/ProfileScreen.js
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Alert, ScrollView, ActivityIndicator, TouchableOpacity, Modal, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { meApi, listRoutineActivities } from "../api";
import { CATEGORIES, TH_DAYS } from "../utils/constants";
import { toDateString, getStartOfWeek } from "../utils/dateUtils";

// --- Components ย่อย (ใช้ UI เหมือนหน้า Activities) ---
const useWeek = (selectedDate) => {
  return useMemo(() => {
    const start = getStartOfWeek(new Date(selectedDate));
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { date: toDateString(d), dayIndex: d.getDay() };
    });
  }, [selectedDate]);
};

const WeekSelector = ({ week, selectedDate, onDateSelect }) => (
  <View style={styles.weekContainer}>
    {week.map(({ date, dayIndex }) => (
      <TouchableOpacity key={date} onPress={() => onDateSelect(date)} style={[styles.dayChip, selectedDate === date && styles.dayChipSelected]}>
        <Text style={[styles.dayChipText, selectedDate === date && styles.dayChipTextSelected]}>{TH_DAYS[dayIndex]}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

// การ์ดสำหรับ "แม่แบบ" (กดแล้วไปหน้า EditRoutine)
const ProfileRoutineCard = ({ item, onEdit }) => {
  const category = CATEGORIES.find(c => c.name === item.category);
  const timeLabel = item.time ? item.time.slice(0, 5) : "-";
  return (
    <TouchableOpacity style={styles.card} onPress={onEdit}>
      <View style={styles.cardRow}>
        <Text style={styles.cardEmoji}>{category?.emoji || "🗓️"}</Text>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.cardTime}>{timeLabel}</Text>
        <Ionicons name="pencil-outline" size={20} color="#777" />
      </View>
    </TouchableOpacity>
  );
};

// --- หน้าจอหลัก ProfileScreen ---
export default function ProfileScreen({ navigation }) {
    const [me, setMe] = useState(null);
    const [allRoutines, setAllRoutines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(toDateString(new Date()));
    const [settingsVisible, setSettingsVisible] = useState(false);
    const week = useWeek(selectedDate);

    // ✅ 2. โหลดข้อมูล Profile และ "แม่แบบ" ทั้งหมด
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [profileData, routineData] = await Promise.all([
                meApi(),
                listRoutineActivities() // ดึงแม่แบบทั้งหมด
            ]);
            setMe(profileData);
            setAllRoutines(routineData);
        } catch (e) {
            console.error('Profile.loadData error:', e);
            const msg = (e && (e.detail || e.message || JSON.stringify(e))) || '';
            Alert.alert("ผิดพลาด", "ไม่สามารถโหลดข้อมูลโปรไฟล์ได้" + (msg ? `\n${msg}` : ''));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener("focus", loadData);
        return unsubscribe;
    }, [navigation, loadData]);

    const handleLogout = () => {
        Alert.alert("ออกจากระบบ", "คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ?", [
            { text: "ยกเลิก", style: "cancel" },
            { text: "ออกจากระบบ", style: "destructive", onPress: async () => {
                await AsyncStorage.removeItem("token");
                navigation.replace("Login");
            }},
        ]);
    };

    // ✅ 3. กรอง "แม่แบบ" ตามวันที่เลือก
    const routinesForSelectedDay = useMemo(() => {
        const d = new Date(selectedDate);
        const dayKey = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][d.getDay()];
        return allRoutines.filter(r => r.day_of_week === dayKey);
    }, [selectedDate, allRoutines]);
    
    // หาวัน (key) เพื่อส่งไปหน้า EditRoutine
    const selectedDayKey = useMemo(() => {
        const d = new Date(selectedDate);
        return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][d.getDay()];
    }, [selectedDate]);

    if (loading) {
        return <View style={styles.centered}><ActivityIndicator size="large" color="#1f6f8b" /></View>;
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <ScrollView>
                {/* --- ส่วนข้อมูลผู้ใช้ --- */}
                <View style={styles.profileHeader}>
                                        <View style={styles.headerTopRow}>
                                                <Text style={styles.username}>{me?.username || 'ผู้ใช้งาน'}</Text>
                                                <TouchableOpacity style={styles.settingsButton} onPress={() => setSettingsVisible(true)}>
                                                        <Ionicons name="settings-outline" size={20} color="#1f6f8b" />
                                                </TouchableOpacity>
                                        </View>
                    <Text style={styles.userInfo}>อีเมล: {me?.email}</Text>
                    {me?.age && <Text style={styles.userInfo}>อายุ: {me.age} ปี</Text>}
                </View>

                                {/* --- เมนูตั้งค่า (ฟันเฟือง) --- */}
                                <Modal
                                    visible={settingsVisible}
                                    transparent
                                    animationType="fade"
                                    onRequestClose={() => setSettingsVisible(false)}
                                >
                                    <Pressable style={styles.modalBackdrop} onPress={() => setSettingsVisible(false)}>
                                        <View style={styles.settingsMenu}>
                                            <TouchableOpacity style={styles.menuItem} onPress={() => { setSettingsVisible(false); navigation.navigate("EditProfile", { me }); }}>
                                                <Ionicons name="pencil-outline" size={18} color="#1f6f8b" />
                                                <Text style={styles.menuText}>แก้ไขโปรไฟล์</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.menuItem} onPress={() => { setSettingsVisible(false); handleLogout(); }}>
                                                <Ionicons name="log-out-outline" size={18} color="#d9534f" />
                                                <Text style={styles.menuText}>ออกจากระบบ</Text>
                                            </TouchableOpacity>
                                            {/* <TouchableOpacity style={styles.menuItem} onPress={() => { setSettingsVisible(false); navigation.navigate("Debug"); }}>
                                                <Ionicons name="bug-outline" size={18} color="#FF6B6B" />
                                                <Text style={styles.menuText}>Debug</Text>
                                            </TouchableOpacity> */}
                                        </View>
                                    </Pressable>
                                </Modal>

                {/* --- ส่วนจัดการแม่แบบ (Routine) --- */}
                <View style={styles.plannerContainer}>
                    <Text style={styles.plannerTitle}>ตารางกิจกรรมประจำสัปดาห์</Text>
                    <WeekSelector week={week} selectedDate={selectedDate} onDateSelect={setSelectedDate} />
                </View>

                <View style={styles.listContent}>
                    {routinesForSelectedDay.length > 0 ? (
                        routinesForSelectedDay.map(item => (
                            <ProfileRoutineCard
                                key={item.id}
                                item={item}
                                // ✅ 4. กดเพื่อ "แก้ไขแม่แบบ"
                                onEdit={() => navigation.navigate('EditRoutine', { routine: item })}
                            />
                        ))
                    ) : (
                        <Text style={styles.emptyText}>ยังไม่มีกิจกรรมประจำวันสำหรับวันนี้</Text>
                    )}
                </View>

            </ScrollView>

            {/* ✅ 5. ปุ่มบวกสำหรับ "สร้างแม่แบบ" ใหม่ */}
            <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate("EditRoutine", { day_of_week: selectedDayKey })}
            >
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    container: { flex: 1, backgroundColor: "#f7f8fa" },
    profileHeader: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff' },
    headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    username: { fontSize: 22, fontWeight: "bold", color: '#1A202C' },
    userInfo: { fontSize: 14, color: '#718096', marginTop: 4 },
    settingsButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eef5f8', alignItems: 'center', justifyContent: 'center' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-start' },
    settingsMenu: { alignSelf: 'flex-end', marginRight: 16, marginTop: 8, backgroundColor: '#fff', borderRadius: 12, elevation: 6, paddingVertical: 8, width: 220, borderWidth: 1, borderColor: '#eee' },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 },
    menuText: { marginLeft: 10, fontSize: 15, color: '#1A202C', fontWeight: '600' },
    plannerContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10, backgroundColor: '#fff', marginTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    plannerTitle: { fontSize: 16, fontWeight: "bold", color: '#333', marginBottom: 16 },
    weekContainer: { flexDirection: "row", justifyContent: 'space-between' },
    dayChip: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: "#f5f5f5", alignItems: "center", marginHorizontal: 2 },
    dayChipSelected: { backgroundColor: "#1f6f8b" },
    dayChipText: { fontWeight: "500", color: '#888' },
    dayChipTextSelected: { fontWeight: "700", color: '#fff' },
    listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },
    emptyText: { textAlign: "center", marginTop: 50, color: "#aaa", fontSize: 16 },
    card: { backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
    cardRow: { flexDirection: "row", alignItems: "center" },
    cardEmoji: { fontSize: 20, marginRight: 12 },
    cardTitle: { flex: 1, fontSize: 15, fontWeight: '500', color: "#333" },
    cardTime: { marginHorizontal: 8, fontSize: 12, color: "#666" },
    addButton: { position: "absolute", bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: "#1f6f8b", justifyContent: "center", alignItems: "center", elevation: 5 },
});