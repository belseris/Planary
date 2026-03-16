/**
 * Profile.js - หน้าจอโปรไฟล์ (Profile Screen)
 * * หน้าที่หลัก:
 * - แสดงข้อมูล user (username, bio, email, gender, age/birthdate, avatar)
 * - แสดงรายการ "แม่แบบกิจกรรมประจำ" (Routine Activities)
 * - คำนวณอายุอัตโนมัติจากวันเกิด
 */

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Alert, ScrollView, ActivityIndicator, TouchableOpacity, Modal, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { meApi, listRoutineActivities, BASE_URL, deleteAccountApi } from "../api";
import { CATEGORIES, TH_DAYS } from "../utils/constants";
import { toDateString, getStartOfWeek } from "../utils/dateUtils";

// --- Helper Functions ---

// คำนวณอายุจากวันเกิด (YYYY-MM-DD)
const calculateAge = (birthdateString) => {
    if (!birthdateString) return null;
    const today = new Date();
    const birthDate = new Date(birthdateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

// จัดรูปแบบวันที่สมัคร (เช่น 12 ม.ค. 2024)
const formatJoinDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("th-TH", { year: 'numeric', month: 'short', day: 'numeric' });
};

// --- Components ---

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
            <TouchableOpacity 
                key={date} 
                onPress={() => onDateSelect(date)} 
                style={[styles.dayChip, selectedDate === date && styles.dayChipSelected]}
            >
                <Text style={[styles.dayChipText, selectedDate === date && styles.dayChipTextSelected]}>
                    {TH_DAYS[dayIndex]}
                </Text>
            </TouchableOpacity>
        ))}
    </View>
);

const ProfileRoutineCard = ({ item, onEdit }) => {
    const category = CATEGORIES.find(c => c.name === item.category);
    // ตัดวินาทีออก (HH:MM:SS -> HH:MM)
    const timeLabel = item.time ? item.time.substring(0, 5) : "-"; 
    
    return (
        <TouchableOpacity style={styles.card} onPress={onEdit}>
            <View style={styles.cardRow}>
                <View style={[styles.iconBox, { backgroundColor: category?.color || '#eee' }]}>
                    <Text style={styles.cardEmoji}>{category?.emoji || "🗓️"}</Text>
                </View>
                <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.cardSubtitle}>{category?.label || 'ทั่วไป'}</Text>
                </View>
                <View style={styles.timeBadge}>
                    <Ionicons name="time-outline" size={12} color="#666" style={{ marginRight: 4 }} />
                    <Text style={styles.cardTime}>{timeLabel}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#ccc" />
            </View>
        </TouchableOpacity>
    );
};

// --- Main Component ---

export default function ProfileScreen({ navigation }) {
    const [me, setMe] = useState(null);
    const [allRoutines, setAllRoutines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(toDateString(new Date()));
    const [settingsVisible, setSettingsVisible] = useState(false);
    const week = useWeek(selectedDate);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [profileData, routineData] = await Promise.all([
                meApi(),
                listRoutineActivities()
            ]);
            setMe(profileData);
            setAllRoutines(routineData);
        } catch (e) {
            console.error('Profile.loadData error:', e);
            Alert.alert("ผิดพลาด", "ไม่สามารถโหลดข้อมูลโปรไฟล์ได้");
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

    const handleDeleteAccount = () => {
        Alert.alert(
            "ลบบัญชี",
            "คุณแน่ใจหรือไม่ว่าต้องการลบบัญชี?",
            [
                { text: "ยกเลิก", style: "cancel" },
                { 
                    text: "ลบบัญชี", 
                    style: "destructive", 
                    onPress: async () => {
                        try {
                            await deleteAccountApi();
                            await AsyncStorage.removeItem("token");
                            Alert.alert("สำเร็จ", "ลบบัญชีแล้ว", [
                                { text: "ตกลง", onPress: () => navigation.replace("Login") }
                            ]);
                        } catch (e) {
                            Alert.alert("ล้มเหลว", "ไม่สามารถลบบัญชีได้");
                        }
                    }
                },
            ]
        );
    };

    // Filter routines by day
    const routinesForSelectedDay = useMemo(() => {
        const d = new Date(selectedDate);
        const dayKey = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][d.getDay()];
        return allRoutines.filter(r => r.day_of_week === dayKey).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    }, [selectedDate, allRoutines]);
    
    const selectedDayKey = useMemo(() => {
        const d = new Date(selectedDate);
        return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][d.getDay()];
    }, [selectedDate]);

    // Determine Age Display
    const displayAge = useMemo(() => {
        if (!me) return "-";
        if (me.birthdate) return calculateAge(me.birthdate);
        return me.age || "-";
    }, [me]);

    if (loading) {
        return <View style={styles.centered}><ActivityIndicator size="large" color="#1f6f8b" /></View>;
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.headerBar}>
                <Text style={styles.headerTitle}>โปรไฟล์</Text>
                <TouchableOpacity style={styles.settingsButton} onPress={() => setSettingsVisible(true)}>
                    <Ionicons name="settings-outline" size={22} color="#1f6f8b" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                
                {/* --- Profile Header Section --- */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        {me?.avatar_url ? (
                            <Image 
                                source={{ uri: `${BASE_URL}${me.avatar_url}` }} 
                                style={styles.avatarImage} 
                            />
                        ) : (
                            <Ionicons name="person" size={40} color="#1f6f8b" />
                        )}
                    </View>
                    <Text style={styles.username}>{me?.username || 'Guest'}</Text>
                </View>

                {/* --- User Info Cards --- */}
                <View style={styles.infoSection}>
                    {/* อีเมล */}
                    <View style={styles.infoRow}>
                        <View style={styles.infoIconBox}><Ionicons name="mail-outline" size={18} color="#1f6f8b" /></View>
                        <View style={styles.infoTextBox}>
                            <Text style={styles.infoLabel}>อีเมล</Text>
                            <Text style={styles.infoValue}>{me?.email || '-'}</Text>
                        </View>
                    </View>

                    <View style={styles.rowSplit}>
                        {/* อายุ (คำนวณจาก birthdate หรือใช้ age เดิม) */}
                        <View style={[styles.infoRow, styles.halfRow]}>
                            <View style={styles.infoIconBox}><Ionicons name="calendar-outline" size={18} color="#1f6f8b" /></View>
                            <View style={styles.infoTextBox}>
                                <Text style={styles.infoLabel}>อายุ</Text>
                                <Text style={styles.infoValue}>{displayAge} ปี</Text>
                            </View>
                        </View>

                        {/* เพศ */}
                        <View style={[styles.infoRow, styles.halfRow]}>
                            <View style={styles.infoIconBox}>
                                <Ionicons name={me?.gender === 'ชาย' ? 'male-outline' : 'female-outline'} size={18} color="#1f6f8b" />
                            </View>
                            <View style={styles.infoTextBox}>
                                <Text style={styles.infoLabel}>เพศ</Text>
                                <Text style={styles.infoValue}>{me?.gender || '-'}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Member Since (ถ้ามี created_at) */}
                    {me?.created_at && (
                        <View style={styles.infoRow}>
                            <View style={styles.infoIconBox}><Ionicons name="time-outline" size={18} color="#1f6f8b" /></View>
                            <View style={styles.infoTextBox}>
                                <Text style={styles.infoLabel}>สมาชิกตั้งแต่</Text>
                                <Text style={styles.infoValue}>{formatJoinDate(me.created_at)}</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* --- Planner Section --- */}
                <View style={styles.plannerHeader}>
                    <Text style={styles.plannerTitle}>กิจวัตรประจำสัปดาห์</Text>
                </View>
                
                <View style={{ paddingHorizontal: 16 }}>
                    <WeekSelector week={week} selectedDate={selectedDate} onDateSelect={setSelectedDate} />
                </View>

                <View style={styles.listContent}>
                    {routinesForSelectedDay.length > 0 ? (
                        routinesForSelectedDay.map(item => (
                            <ProfileRoutineCard
                                key={item.id}
                                item={item}
                                onEdit={() => navigation.navigate('EditRoutine', { routine: item })}
                            />
                        ))
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="calendar-clear-outline" size={48} color="#ddd" />
                            <Text style={styles.emptyText}>ไม่มีรายการกิจวัตร{"\n"}สำหรับวันนี้</Text>
                        </View>
                    )}
                </View>

            </ScrollView>

            {/* --- Settings Modal --- */}
            <Modal
                visible={settingsVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setSettingsVisible(false)}
            >
                <Pressable style={styles.modalBackdrop} onPress={() => setSettingsVisible(false)}>
                    <View style={styles.settingsMenu}>
                        <TouchableOpacity style={styles.menuItem} onPress={() => { setSettingsVisible(false); navigation.navigate("EditProfile", { me }); }}>
                            <Ionicons name="pencil-outline" size={20} color="#1f6f8b" />
                            <Text style={styles.menuText}>แก้ไขโปรไฟล์</Text>
                        </TouchableOpacity>
                        <View style={styles.menuDivider} />
                        {/* <TouchableOpacity style={styles.menuItem} onPress={() => { setSettingsVisible(false); navigation.navigate("Debug"); }}>
                            <Ionicons name="bug-outline" size={20} color="#f39c12" />
                            <Text style={[styles.menuText, { color: '#f39c12' }]}>🧪 ทดสอบการแจ้งเตือน</Text>
                        </TouchableOpacity> */}
                        <View style={styles.menuDivider} />
                        <TouchableOpacity style={styles.menuItem} onPress={() => { setSettingsVisible(false); handleLogout(); }}>
                            <Ionicons name="log-out-outline" size={20} color="#d9534f" />
                            <Text style={[styles.menuText, { color: '#d9534f' }]}>ออกจากระบบ</Text>
                        </TouchableOpacity>
                        <View style={styles.menuDivider} />
                        <TouchableOpacity style={styles.menuItem} onPress={() => { setSettingsVisible(false); handleDeleteAccount(); }}>
                            <Ionicons name="trash-outline" size={20} color="#ff4d4f" />
                            <Text style={[styles.menuText, { color: '#ff4d4f' }]}>ลบบัญชี</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>

            {/* FAB Add Button */}
            <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate("EditRoutine", { day_of_week: selectedDayKey })}
            >
                <Ionicons name="add" size={30} color="#fff" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    container: { flex: 1, backgroundColor: "#f7f9fc" },
    
    // Header
    headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#fff' },
    headerTitle: { fontSize: 20, fontWeight: "bold", color: '#1A202C' },
    settingsButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0f4f8', alignItems: 'center', justifyContent: 'center' },

    // Profile Section
    profileSection: { alignItems: 'center', paddingVertical: 20, backgroundColor: '#fff', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingBottom: 30, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    avatarContainer: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#e6f2f5', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 3, borderColor: '#fff', shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
    avatarImage: { width: 84, height: 84, borderRadius: 42 },
    username: { fontSize: 22, fontWeight: "bold", color: '#1A202C', marginBottom: 4 },
    bio: { fontSize: 14, color: '#718096', fontStyle: 'italic' },

    // Info Section
    infoSection: { paddingHorizontal: 16, marginTop: 16 },
    infoRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 8 },
    rowSplit: { flexDirection: 'row', justifyContent: 'space-between' },
    halfRow: { flex: 0.48 },
    infoIconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f0f4f8', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    infoTextBox: { flex: 1 },
    infoLabel: { fontSize: 11, color: '#A0AEC0', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
    infoValue: { fontSize: 15, color: '#2D3748', fontWeight: '500' },

    // Planner Section
    plannerHeader: { paddingHorizontal: 20, marginTop: 24, marginBottom: 12 },
    plannerTitle: { fontSize: 18, fontWeight: "bold", color: '#2D3748' },
    weekContainer: { flexDirection: "row", justifyContent: 'space-between', marginBottom: 16 },
    dayChip: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", marginHorizontal: 3, borderWidth: 1, borderColor: '#E2E8F0' },
    dayChipSelected: { backgroundColor: "#1f6f8b", borderColor: '#1f6f8b', shadowColor: "#1f6f8b", shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
    dayChipText: { fontSize: 12, fontWeight: "600", color: '#A0AEC0' },
    dayChipTextSelected: { color: '#fff' },

    // Routine List
    listContent: { paddingHorizontal: 16 },
    card: { backgroundColor: "#fff", borderRadius: 16, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    cardRow: { flexDirection: "row", alignItems: "center", flex: 1 },
    iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    cardEmoji: { fontSize: 20 },
    cardContent: { flex: 1 },
    cardTitle: { fontSize: 15, fontWeight: '600', color: "#2D3748", marginBottom: 2 },
    cardSubtitle: { fontSize: 12, color: "#718096" },
    timeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f7fafc', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 8 },
    cardTime: { fontSize: 12, fontWeight: '600', color: "#4A5568" },

    emptyContainer: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { textAlign: "center", marginTop: 12, color: "#A0AEC0", fontSize: 14, lineHeight: 20 },

    // Modal
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-start', alignItems: 'flex-end' },
    settingsMenu: { marginTop: 60, marginRight: 20, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 8, width: 200, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 10, elevation: 10 },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20 },
    menuDivider: { height: 1, backgroundColor: '#EDF2F7', marginHorizontal: 20 },
    menuText: { marginLeft: 12, fontSize: 15, color: '#2D3748', fontWeight: '500' },

    // FAB
    addButton: { position: "absolute", bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: "#1f6f8b", justifyContent: "center", alignItems: "center", shadowColor: "#1f6f8b", shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
});