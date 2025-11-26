/**
 * Diary.js - หน้าจอรายการบันทึกไดอารี่ (Diary List Screen)
 * 
 * หน้าที่หลัก:
 * - แสดงรายการบันทึกไดอารี่ทั้งหมด จัดกลุ่มตามวันที่ (SectionList)
 * - มีปุ่มเลือกเดือน/ปี เพื่อกรองบันทึก
 * - รองรับ 2D Mood System (แสดงดาว 1-5 และ emoji tags)
 * - สร้าง "การ์ดบันทึกร่าง" สำหรับเมื่อวานอัตโนมัติ (ถ้ายังไม่มีบันทึก)
 * - กดที่การ์ดเพื่อไปแก้ไขบันทึก (navigate to EditDiary)
 * 
 * Auto-Draft Logic:
 * เมื่อโหลดบันทึกของเดือนปัจจุบัน ระบบจะตรวจสอบว่า:
 * 1. มีบันทึกของเมื่อวานหรือยัง?
 * 2. ถ้ายังไม่มี: สร้างการ์ด "draft" ปลอมๆ ขึ้นมาแสดงที่ด้านบน
 * 3. เมื่อกดการ์ด draft: navigate ไป EditDiary โหมด "createAuto" 
 *    เพื่อสรุปกิจกรรมและสร้างบันทึกจริงๆ
 * 
 * Components:
 * - StarDisplay: แสดงดาว 1-5 (read-only)
 * - DiaryCard: การ์ดแสดงบันทึก 1 รายการ (title, detail, stars, emoji tags)
 * - DiaryScreen: main component (มี month picker, loading state, SectionList)
 */

// src/screens/DiaryScreen.js

import React, { useState, useCallback } from "react";
import { View, Text, SectionList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { listDiaries } from "../api";  // API สำหรับดึงรายการบันทึก
import { toDateString } from "../utils/dateUtils";  // แปลง Date เป็น YYYY-MM-DD 

const MONTHS = [ "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค." ];
const DAYS = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];

// ✅ 2. สร้าง Component StarRating (แบบ Read-only)
const StarDisplay = ({ score }) => {
  if (!score || score === 0) return <Text style={styles.cardNoScore}>ยังไม่ให้คะแนน</Text>;
  return (
    <View style={styles.iconRow}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons
          key={i}
          name={i <= score ? "star" : "star-outline"}
          size={16}
          color={i <= score ? "#f5c518" : "#ccc"}
        />
      ))}
    </View>
  );
};

function DiaryCard({ item, onPress }) {
  // ✅ 3. ปรับการ์ดให้แสดงผล 2D Mood System
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title || "(ไม่มีชื่อเรื่อง)"}</Text>
        <Text style={styles.cardNotes} numberOfLines={2}>{item.detail || "..."}</Text>
        <StarDisplay score={item.mood_score} />
        {/* แสดงแท็ก Emoji ที่เลือกไว้เป็นแถวเล็กๆ (ถ้ามี) */}
        {item.mood_tags && item.mood_tags.length > 0 && (
          <View style={styles.cardTagsRow}>
            {item.mood_tags.map((tag, idx) => (
              <View key={idx} style={styles.cardTag}>
                <Text style={styles.cardTagEmoji}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <View style={styles.cardAside}>
        <Ionicons name="pencil" size={18} color="#333" />
      </View>
    </TouchableOpacity>
  );
}

export default function DiaryScreen() {
  const navigation = useNavigation();
  const today = new Date();
  const insets = useSafeAreaInsets();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ 4. Logic ใหม่สำหรับ "สร้างบันทึกร่างอัตโนมัติ"
  const checkAndCreateDraft = (diaries) => {
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = toDateString(yesterday);

    // 1. ตรวจสอบว่า "บันทึกของเมื่อวาน" อยู่ในรายการที่ดึงมาหรือไม่
    const draftExists = diaries.some(d => d.date === yesterdayStr);

    // 2. ถ้ายังไม่มี ให้สร้าง "การ์ดบันทึกร่าง" ปลอมๆ ขึ้นมา
    if (!draftExists) {
      const draftDiary = {
        id: `draft-${yesterdayStr}`, // ID พิเศษสำหรับ Draft
        date: yesterdayStr,
        title: `บันทึกร่าง: ${yesterdayStr}`,
        detail: "กดเพื่อสรุปกิจกรรมและบันทึก...",
        mood_score: 0,
        isDraft: true, // Flag สำหรับบอกว่านี่คือร่าง
      };
      // คืนค่า [ร่างของเมื่อวาน, ...บันทึกเก่าๆ]
      return [draftDiary, ...diaries];
    }
    
    // ถ้ามีอยู่แล้ว ก็คืนค่าเดิม
    return diaries;
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = new Date(year, selectedMonth, 1).toISOString().slice(0, 10);
      const endDate = new Date(year, selectedMonth + 1, 0).toISOString().slice(0, 10);
      let diaries = await listDiaries({ startDate, endDate });

      // ✅ 5. เรียกใช้ฟังก์ชันสร้างร่าง
      // (เฉพาะเมื่อดูเดือนปัจจุบันเท่านั้น)
      if (year === today.getFullYear() && selectedMonth === today.getMonth()) {
        diaries = checkAndCreateDraft(diaries);
      }
      
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

  const changeMonth = (delta) => { /* ... (เหมือนเดิม) ... */ };
  
  const formatSectionHeaderDate = (dateString) => {
    try {
      const d = new Date(dateString);
      const day = d.getDate();
      const month = MONTHS[d.getMonth()];
      const year = d.getFullYear() + 543; // Thai year
      const dayName = DAYS[d.getDay()];
      return `${day} ${month} ${year} • ${dayName}`;
    } catch {
      return dateString;
    }
  };

  // ✅ 6. Logic การกดปุ่ม
  const handleCardPress = (item) => {
    if (item.isDraft) {
      // ถ้าเป็นร่าง ให้ส่ง "date" ไป (ไม่มี id)
      // `EditDiaryScreen` จะรู้เองว่าต้องไปดึงกิจกรรมมาสรุป
      navigation.navigate("EditDiary", { id: null, date: item.date });
    } else {
      // ถ้าเป็นบันทึกจริง ให้ส่ง "id" ไป
      navigation.navigate("EditDiary", { id: item.id });
    }
  };
  
  const todayStr = toDateString(new Date());

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.monthBar}>
        {/* ... (MonthBar เหมือนเดิม) ... */}
      </View>
      {loading ? <ActivityIndicator size="large" style={{ marginTop: 50 }} /> : sections.length === 0 ? (
        <View style={styles.emptyContainer}><Text style={styles.emptyText}>ไม่มีบันทึกในเดือนนี้</Text></View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id.toString()}
          renderSectionHeader={({ section: { title } }) => <View style={styles.sectionHeader}><Text style={styles.sectionHeaderText}>{formatSectionHeaderDate(title)}</Text></View>}
          // ✅ 7. เรียกใช้ handleCardPress
          renderItem={({ item }) => <DiaryCard item={item} onPress={() => handleCardPress(item)}/>} 
        />
      )}
      {/* ✅ 8. ปุ่มบวก (FAB) จะส่ง `manual: true` เพื่อบอกว่า "ฉันสร้างเอง" */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("EditDiary", { manual: true, date: todayStr })}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ✅ 9. อัปเดต Styles
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F7F7" },
  monthBar: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 16, alignItems: "center", backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  monthButton: { padding: 8 },
  monthText: { fontSize: 18, fontWeight: "bold" },
  sectionHeader: { backgroundColor: "#F7F7F7", paddingHorizontal: 16, paddingVertical: 10, paddingTop: 16 },
  sectionHeaderText: { fontWeight: "600", color: '#333', fontSize: 15 },
  card: { backgroundColor: "#FFFFFF", marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 12, flexDirection: "row", elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  cardContent: { flex: 1 },
  cardAside: { alignItems: "center", justifyContent: 'space-between', marginLeft: 16, minWidth: 40 },
  cardTitle: { fontSize: 17, fontWeight: "600", marginBottom: 4, color: '#111' },
  cardNotes: { fontSize: 14, color: "#777", lineHeight: 20, marginBottom: 8 },
  cardTagsRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 8, gap: 6 },
  cardTag: { backgroundColor: "#f0f3f7", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  cardTagEmoji: { fontSize: 16 },
  iconRow: { flexDirection: "row", marginTop: 4 },
  cardNoScore: { fontSize: 12, color: '#aaa', fontStyle: 'italic', marginTop: 4 },
  fab: { position: "absolute", right: 20, bottom: 20, backgroundColor: "#007BFF", width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", elevation: 5 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 18, color: '#888', fontWeight: '600' },
});