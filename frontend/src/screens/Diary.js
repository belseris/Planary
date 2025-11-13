// src/screens/DiaryScreen.js

import React, { useState, useCallback } from "react";
import { View, Text, SectionList, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { listDiaries } from "../diary";

const MONTHS = [ "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค." ];
const DAYS = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];
const activityIconMap = {
  เรียน: "school-outline",
  ทำงาน: "briefcase-outline",
  ท่องเที่ยว: "camera-outline",
  เดินทาง: "car-sport-outline",
  ออกกำลังกาย: "barbell-outline",
  กินข้าว: "fast-food-outline",
};

function ActivityIcons({ activities }) {
  if (!activities || activities.length === 0) return null;
  const uniqueCategories = [...new Set(activities.map((a) => a.category))];
  return (
    <View style={styles.iconRow}>
      {uniqueCategories.map((category) => {
        const iconName = activityIconMap[category];
        return iconName ? <Ionicons key={category} name={iconName} size={20} color="#555" style={{ marginRight: 8 }}/> : null;
      })}
    </View>
  );
}

function DiaryCard({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.cardContent}>
        <Text style={styles.cardTime}>{item.time?.slice(0, 5)} น.</Text>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.cardNotes} numberOfLines={2}>{item.detail || "ไม่มีรายละเอียด"}</Text>
        <ActivityIcons activities={item.activities} />
      </View>
      <View style={styles.cardAside}>
        <Text style={styles.cardMood}>{item.mood}</Text>
        <Ionicons name="pencil" size={18} color="#333" />
      </View>
    </TouchableOpacity>
  );
}

export default function DiaryScreen() {
  const navigation = useNavigation();
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = new Date(year, selectedMonth, 1).toISOString().slice(0, 10);
      const endDate = new Date(year, selectedMonth + 1, 0).toISOString().slice(0, 10);
      const diaries = await listDiaries({ startDate, endDate });
      
      const groupedData = diaries.reduce((acc, diary) => {
        const dateKey = diary.date;
        if (!acc[dateKey]) acc[dateKey] = { title: dateKey, data: [] };
        acc[dateKey].data.push(diary);
        return acc;
      }, {});
      setSections(Object.values(groupedData));
    } catch (err) {
      console.error("Failed to load diaries:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, year]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const changeMonth = (delta) => {
    const newDate = new Date(year, selectedMonth + delta, 1);
    setSelectedMonth(newDate.getMonth());
    setYear(newDate.getFullYear());
  };

  const formatSectionHeaderDate = (dateString) => {
    const d = new Date(dateString);
    return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.monthBar}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthButton}><Ionicons name="chevron-back" size={24} /></TouchableOpacity>
        <Text style={styles.monthText}>{MONTHS[selectedMonth]} {year + 543}</Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthButton}><Ionicons name="chevron-forward" size={24} /></TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator size="large" style={{ marginTop: 50 }} /> : sections.length === 0 ? (
        <View style={styles.emptyContainer}><Text style={styles.emptyText}>ไม่มีบันทึกในเดือนนี้</Text></View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id.toString()}
          renderSectionHeader={({ section: { title } }) => <View style={styles.sectionHeader}><Text style={styles.sectionHeaderText}>{formatSectionHeaderDate(title)}</Text></View>}
          renderItem={({ item }) => <DiaryCard item={item} onPress={() => navigation.navigate("EditDiary", { diaryId: item.id })}/>}
        />
      )}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("EditDiary")}><Ionicons name="add" size={32} color="#fff" /></TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F7F7" },
  monthBar: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 16, alignItems: "center", backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  monthButton: { padding: 8 },
  monthText: { fontSize: 18, fontWeight: "bold" },
  sectionHeader: { backgroundColor: "#F7F7F7", paddingHorizontal: 16, paddingVertical: 8, paddingTop: 16 },
  sectionHeaderText: { fontWeight: "600", color: '#555' },
  card: { backgroundColor: "#FFFFFF", marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 12, flexDirection: "row", elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  cardContent: { flex: 1 },
  cardAside: { alignItems: "center", justifyContent: 'space-between', marginLeft: 16 },
  cardTime: { fontSize: 13, color: "#666", marginBottom: 4 },
  cardTitle: { fontSize: 17, fontWeight: "600", marginBottom: 4, color: '#111' },
  cardNotes: { fontSize: 14, color: "#777", lineHeight: 20 },
  cardMood: { fontSize: 32 },
  iconRow: { flexDirection: "row", marginTop: 12 },
  fab: { position: "absolute", right: 20, bottom: 20, backgroundColor: "#007BFF", width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", elevation: 5 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 18, color: '#888', fontWeight: '600' },
});