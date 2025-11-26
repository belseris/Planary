/**
 * Activities.js - หน้าจอกิจกรรม (Activities Screen)
 * 
 * หน้าที่หลัก:
 * - แสดงรายการกิจกรรมของวันที่เลือก (จัดกลุ่มตาม category)
 * - มี Week Selector เพื่อเลือกดูกิจกรรมของแต่ละวัน
 * - รองรับ Auto-Instantiate Routine Activities (สร้างจากแม่แบบอัตโนมัติ)
 * - กดที่การ์ดเพื่อไปหน้า ActivityDetail (ดูรายละเอียด + แก้ไข)
 * - ปุ่ม + สร้างกิจกรรมใหม่
 * 
 * Components:
 * - useWeek: Hook สำหรับคำนวณวันในสัปดาห์
 * - WeekSelector: Component แสดงปุ่มเลือกวัน (จันทร์-อาทิตย์)
 * - CategorySection: หัวหมวดหมู่ (แสดง emoji + ชื่อหมวดหมู่)
 * - ActivityCard: การ์ดแสดงกิจกรรม 1 รายการ (status, time, title)
 * 
 * Data Flow:
 * 1. เลือกวันผ่าน Week Selector
 * 2. เรียก GET /activities?qdate=YYYY-MM-DD
 * 3. Backend จะ auto-instantiate routine activities ของวันนั้นให้อัตโนมัติ
 * 4. แสดงผลใน SectionList จัดกลุ่มตาม category
 * 
 * Status Icons:
 * - ✅ done: สีเขียว
 * - 🔥 urgent: สีแดง
 * - ⚠️ cancelled: สีเทา
 * - ⚪ normal: สีน้ำเงิน
 */

// screens/ActivitiesScreen.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, SectionList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from 'react-native-safe-area-context';
import { listActivities } from "../api";
import { CATEGORIES, STATUSES, TH_DAYS } from "../utils/constants";  // Constants สำหรับ UI
import { toDateString, getStartOfWeek } from "../utils/dateUtils";  // Date utilities

// --- Components (useWeek, WeekSelector) ---
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

const WeekSelector = ({ week, selectedDate, onDateSelect }) => {
  const goToPreviousWeek = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() - 7);
    onDateSelect(toDateString(current));
  };

  const goToNextWeek = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + 7);
    onDateSelect(toDateString(current));
  };

  const isCurrentWeek = () => {
    const today = new Date();
    const current = new Date(selectedDate);
    const todayWeekStart = getStartOfWeek(today);
    const currentWeekStart = getStartOfWeek(current);
    return todayWeekStart.getTime() === currentWeekStart.getTime();
  };

  return (
    <View>
      <View style={styles.weekNavContainer}>
        <TouchableOpacity onPress={goToPreviousWeek} style={styles.weekNavButton}>
          <Ionicons name="chevron-back" size={24} color="#1f6f8b" />
        </TouchableOpacity>
        <Text style={styles.weekNavText}>
          {week[0]?.date && `${new Date(week[0].date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - ${new Date(week[6].date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`}
        </Text>
        <TouchableOpacity 
          onPress={goToNextWeek} 
          style={[styles.weekNavButton, isCurrentWeek() && styles.weekNavButtonDisabled]}
          disabled={isCurrentWeek()}
        >
          <Ionicons name="chevron-forward" size={24} color={isCurrentWeek() ? "#ccc" : "#1f6f8b"} />
        </TouchableOpacity>
      </View>
      <View style={styles.weekContainer}>
        {week.map(({ date, dayIndex }) => (
          <TouchableOpacity key={date} onPress={() => onDateSelect(date)} style={[styles.dayChip, selectedDate === date && styles.dayChipSelected]}>
            <Text style={[styles.dayChipText, selectedDate === date && styles.dayChipTextSelected]}>{TH_DAYS[dayIndex]}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// --- ActivityCard (ฉบับแก้ไข) ---
const ActivityCard = ({ item, onPress }) => {
  const statusStyle = STATUSES[item.status] || STATUSES.normal;
  const category = CATEGORIES.find(c => c.name === item.category);
  const timeLabel = item.all_day ? "ทั้งวัน" : (item.time ? item.time.slice(0, 5) : "-");
  const isFromRoutine = !!item.routine_id; // ✅ 3. ตรวจสอบจาก routine_id

  return (
    // ✅ 4. onPress ทำงานทุกการ์ด
    <TouchableOpacity style={[styles.card, isFromRoutine && styles.routineCard]} onPress={onPress}>
      <View style={styles.cardRow}>
        <Text style={styles.cardEmoji}>{category?.emoji || "📁"}</Text>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.cardTime}>{timeLabel}</Text>
        <View style={[styles.badge, { backgroundColor: statusStyle.backgroundColor }]}>
          <Text style={{ color: statusStyle.color, fontWeight: "bold" }}>{statusStyle.label}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// --- หน้าจอหลัก ---
export default function ActivitiesScreen({ navigation }) {
    const [selectedDate, setSelectedDate] = useState(toDateString(new Date()));
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const week = useWeek(selectedDate);

    // ✅ 5. loadActivities เรียก API เดียว
    const loadActivities = useCallback(async () => {
        setLoading(true);
        try {
            // Backend จะสร้าง Activity จาก Routine ให้เอง
            const activityData = await listActivities({ qdate: selectedDate });
            setItems(activityData.items || []);
        } catch (e) {
            Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลกิจกรรมได้");
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => { loadActivities(); }, [selectedDate, loadActivities]);
    useEffect(() => {
        const unsubscribe = navigation.addListener("focus", () => loadActivities());
        return unsubscribe;
    }, [navigation, loadActivities]);

    // ✅ 6. จัดกลุ่มโดยใช้ routine_id
    const groupedItems = useMemo(() => {
        const groups = { "กิจกรรมประจำวัน": [] };
        const regularGroups = {};

        items.forEach(item => {
            if (item.routine_id) {
                groups["กิจกรรมประจำวัน"].push(item);
            } else {
                const statusLabel = STATUSES[item.status]?.label || "อื่นๆ";
                if (!regularGroups[statusLabel]) regularGroups[statusLabel] = [];
                regularGroups[statusLabel].push(item);
            }
        });
        const combined = { ...groups, ...regularGroups };
        return Object.entries(combined)
            .filter(([_, data]) => data.length > 0)
            .map(([title, data]) => ({ title, data }));
    }, [items]);

    const formattedDateHeader = useMemo(() => new Date(selectedDate).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" }), [selectedDate]);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.headerContainer}>
                <WeekSelector week={week} selectedDate={selectedDate} onDateSelect={setSelectedDate} />
                <Text style={styles.dateHeader}>วันที่ {formattedDateHeader}</Text>
            </View>
            <View style={styles.listContainer}>
                {(loading && items.length === 0) ? <ActivityIndicator size="large" style={{ marginTop: 50 }} color="#1f6f8b" /> : (
                    <SectionList
                        sections={groupedItems}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => <ActivityCard item={item} onPress={() => navigation.navigate("ActivityDetail", { id: item.id })} />}
                        renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
                        ListEmptyComponent={<Text style={styles.empty}>ยังไม่มีกิจกรรมในวันนี้</Text>}
                        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
                    />
                )}
                {loading && items.length > 0 && <View style={styles.loadingOverlay}><ActivityIndicator size="large" color="#1f6f8b" /></View>}
            </View>
            <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate("EditActivity", { date: selectedDate })}>
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f7f8fa" },
    listContainer: { flex: 1 },
    loadingOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(247, 248, 250, 0.7)", justifyContent: "center", alignItems: "center" },
    headerContainer: { paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 10 : 0, paddingBottom: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    weekNavContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    weekNavButton: { padding: 8, borderRadius: 8, backgroundColor: '#f5f5f5' },
    weekNavButtonDisabled: { opacity: 0.3 },
    weekNavText: { fontSize: 15, fontWeight: '600', color: '#333' },
    weekContainer: { flexDirection: "row", justifyContent: 'space-between' },
    dayChip: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: "#f5f5f5", alignItems: "center", marginHorizontal: 2 },
    dayChipSelected: { backgroundColor: "#1f6f8b" },
    dayChipText: { fontWeight: "500", color: '#888' },
    dayChipTextSelected: { fontWeight: "700", color: '#fff' },
    dateHeader: { fontSize: 16, fontWeight: "bold", color: '#333', marginTop: 16 },
    sectionHeader: { fontSize: 14, fontWeight: "700", marginTop: 16, marginBottom: 8, color: '#555', paddingHorizontal: 4 },
    card: { backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#eee' },
    routineCard: { backgroundColor: '#f0f9ff', borderColor: '#a3d8f4' },
    cardRow: { flexDirection: "row", alignItems: "center" },
    cardEmoji: { fontSize: 20, marginRight: 12 },
    cardTitle: { flex: 1, fontSize: 15, fontWeight: '500', color: "#333" },
    cardTime: { marginHorizontal: 8, fontSize: 12, color: "#666" },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    empty: { textAlign: "center", marginTop: 50, color: "#aaa", fontSize: 16 },
    addButton: { position: "absolute", bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: "#1f6f8b", justifyContent: "center", alignItems: "center", elevation: 5 }
});