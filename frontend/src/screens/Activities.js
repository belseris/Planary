import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, SectionList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { listActivities } from "../activities";

// --- ใช้ข้อมูลจากโค้ดเดิม ---
const STATUS_LABELS = {
  warning: "กำลังเริ่ม",
  success: "สมบูรณ์",
  danger: "หมดเวลา",
  normal: "ปกติ",
};

const STATUS_STYLES = {
  danger:   { backgroundColor: '#fff1f0', color: '#ff4d4f' },
  warning:  { backgroundColor: '#fffbe6', color: '#faad14' },
  success:  { backgroundColor: '#f6ffed', color: '#52c41a' },
  normal:   { backgroundColor: '#fafafa', color: '#8c8c8c' },
};

// --- เพิ่ม: นำข้อมูลหมวดหมู่พร้อมอีโมจิมาใช้ ---
const CATEGORIES = [
  { name: "เรียน", emoji: "📚" },
  { name: "ทำงาน", emoji: "💼" },
  { name: "ออกกำลังกาย", emoji: "🏋️" },
  { name: "เรื่องบ้าน", emoji: "🏠" },
  { name: "ส่วนตัว", emoji: "👤" },
  { name: "สุขภาพ", emoji: "❤️‍🩹" },
];

const TH_DAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function toDateStr(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function startOfWeekMon(d) {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  const nd = new Date(d);
  nd.setDate(d.getDate() + diff);
  return nd;
}

function useWeek(selectedDate) {
  return useMemo(() => {
    const base = startOfWeekMon(new Date(selectedDate));
    const arr = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      arr.push({ date: toDateStr(d), jsDay: d.getDay() });
    }
    return arr;
  }, [selectedDate]);
}

function groupByStatus(items) {
  const groups = {};
  items.forEach(it => {
    const label = STATUS_LABELS[it.status] || "อื่น ๆ";
    if (!groups[label]) groups[label] = [];
    groups[label].push(it);
  });
  return Object.entries(groups).map(([title, data]) => ({ title, data }));
}

export default function ActivitiesScreen({ navigation }) {
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()));
  const [items, setItems] = useState([]);
  const week = useWeek(selectedDate);

  const load = useCallback(async () => {
    try {
      const data = await listActivities({ qdate: selectedDate });
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      console.error(e);
      Alert.alert("โหลดกิจกรรมไม่สำเร็จ");
      setItems([]);
    }
  }, [selectedDate]);

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    return unsub;
  }, [navigation, load]);
  useEffect(() => { load(); }, [load]);

  const grouped = useMemo(() => groupByStatus(items), [items]);
  
  const headingTH = useMemo(() => {
    try {
      return new Date(selectedDate).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
    } catch { return selectedDate; }
  }, [selectedDate]);

  const renderDayChip = (dobj) => {
    const isSelected = dobj.date === selectedDate;
    return (
      <TouchableOpacity
        key={dobj.date}
        onPress={() => setSelectedDate(dobj.date)}
        style={[styles.dayChip, isSelected && styles.dayChipSelected]}
      >
        <Text style={[styles.dayChipText, isSelected && styles.dayChipTextSelected]}>{TH_DAYS[dobj.jsDay]}</Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }) => {
    const pill = item.all_day ? "ทั้งวัน" : (item.time ? item.time.slice(0, 5) : "-");
    const style = STATUS_STYLES[item.status] || STATUS_STYLES.normal;
    // --- เพิ่ม: ค้นหาอีโมจิจากหมวดหมู่ ---
    const category = CATEGORIES.find(c => c.name === item.category);
    const emoji = category ? category.emoji : "📁"; // 📁 เป็นอีโมจิเริ่มต้น

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate("EditActivity", { id: item.id })}
        style={styles.card}
      >
        <View style={styles.cardRow}>
          {/* --- เพิ่ม: แสดงอีโมจิ --- */}
          <Text style={styles.cardEmoji}>{emoji}</Text>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.cardTime}>{pill}</Text>
          <View style={[styles.badge, { backgroundColor: style.backgroundColor }]}>
            <Text style={{ color: style.color, fontWeight: "bold" }}>
              {STATUS_LABELS[item.status] || "ปกติ"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }) => (
    <Text style={styles.sectionHeader}>{section.title}</Text>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.weekContainer}>{week.map(renderDayChip)}</View>
        <Text style={styles.dateHeader}>วันที่ {headingTH}</Text>
      </View>
      
      <SectionList
        sections={grouped}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={<Text style={styles.empty}>ยังไม่มีกิจกรรมในวันนี้</Text>}
        contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }}
      />
      
      <View style={styles.addContainer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate("EditActivity", { date: selectedDate })}
        >
          <Ionicons name="add" size={20} color="#333" />
          <Text style={styles.addText}>เพิ่มกิจกรรม</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  headerContainer: { paddingHorizontal: 16, paddingTop: 44, paddingBottom: 10, backgroundColor: '#fff' },
  weekContainer: { flexDirection: "row", marginBottom: 16, justifyContent: 'space-between' },
  dayChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: "#f5f5f5", minWidth: 44, alignItems: "center" },
  dayChipSelected: { backgroundColor: "rgba(255, 219, 231, 0.5)", borderWidth: 1, borderColor: "#ff9fbf" },
  dayChipText: { fontWeight: "500", color: '#888' },
  dayChipTextSelected: { fontWeight: "700", color: '#000' },
  dateHeader: { fontSize: 16, fontWeight: "bold", color: '#333', paddingHorizontal: 16 },
  sectionHeader: { fontSize: 14, fontWeight: "700", marginTop: 12, marginBottom: 6, color: '#555' },
  card: { backgroundColor: "#f7f7f7", borderRadius: 10, padding: 12, marginBottom: 8 },
  cardRow: { flexDirection: "row", alignItems: "center" },
  // --- เพิ่ม: สไตล์สำหรับอีโมจิ ---
  cardEmoji: { fontSize: 20, marginRight: 10 },
  cardTitle: { flex: 1, fontSize: 14, color: "#333" },
  cardTime: { marginHorizontal: 8, fontSize: 12, color: "#666" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  empty: { textAlign: "center", marginTop: 40, color: "#aaa" },
  addContainer: { position: "absolute", bottom: 20, left: 0, right: 0, alignItems: "center" },
  addButton: { flexDirection: "row", backgroundColor: "#f0f0f0", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5 },
  addText: { marginLeft: 6, fontSize: 16, fontWeight: '600', color: '#444' }
});

