// src/screens/EditDiaryScreen.js

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, Modal, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
// 1. Import `deleteDiary` เข้ามาใช้งาน
import { getDiary, createDiary, updateDiary, deleteDiary } from "../diary"; 
import { listActivities } from "../activities"; 

// --- Star Rating ---
const StarRating = ({ value, onChange }) => (
  <View style={styles.starContainer}>
    {[1, 2, 3, 4, 5].map(i => (
      <TouchableOpacity key={i} onPress={() => onChange(i)}>
        <Ionicons
          name={i <= value ? "star" : "star-outline"}
          size={24}
          color={i <= value ? "#f5c518" : "#ccc"}
        />
      </TouchableOpacity>
    ))}
  </View>
);

const MOODS = ["🙂", "😄", "😢", "😠", "😌", "🤩"];

// --- Screen ---
export default function EditDiaryScreen({ route, navigation }) {
  const id = route.params?.id || null;
  const initDate = route.params?.date || new Date().toISOString().slice(0, 10);

  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [date, setDate] = useState(initDate);
  const [mood, setMood] = useState(MOODS[0]);
  const [dayActivities, setDayActivities] = useState([]); 
  
  const [loading, setLoading] = useState(!!id);
  const [isMoodModalVisible, setMoodModalVisible] = useState(false);

  // โหลดข้อมูล
  const load = useCallback(async () => {
    try {
      setLoading(true);
      // โหลดกิจกรรมของวัน
      const activityData = await listActivities({ qdate: date });
      const activitiesWithFeedback = (activityData.items || []).map(act => ({
        ...act,
        rating: act.rating || 0,
        activityMood: act.activityMood || MOODS[0],
      }));

      if (id) {
        // โหลด Diary เดิม
        const diaryData = await getDiary(id);
        setTitle(diaryData.title);
        setDetail(diaryData.detail || "");
        setMood(diaryData.mood || MOODS[0]);

        // Merge feedback ที่เคยบันทึกไว้
        const reviewedActivities = activitiesWithFeedback.map(act => {
          const savedFeedback = Array.isArray(diaryData.activities)
            ? diaryData.activities.find(f => f.id === act.id)
            : null;
          return savedFeedback ? { ...act, ...savedFeedback } : act;
        });
        setDayActivities(reviewedActivities);
      } else {
        setDayActivities(activitiesWithFeedback);
      }
    } catch (e) {
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลได้");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id, date]);

  useEffect(() => {
    load();
  }, [load]);

  // บันทึก
  const onSave = async () => {
    if (!title.trim()) {
      Alert.alert("ข้อมูลไม่ครบถ้วน", "กรุณากรอกชื่อเรื่อง");
      return;
    }
    const now = new Date();
    const payload = {
      date,
      time: `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:00`,
      title: title.trim(),
      detail: detail.trim(),
      mood,
      activities: dayActivities.map(({ id, category, title, rating, activityMood }) => ({
        id, category, title, rating, activityMood,
      })),
    };

    try {
      if (id) {
        await updateDiary(id, payload);
      } else {
        await createDiary(payload);
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert("บันทึกไม่สำเร็จ", e?.response?.data?.detail || "กรุณาตรวจสอบข้อมูลอีกครั้ง");
      console.error(e);
    }
  };

  // 2. เพิ่มฟังก์ชันสำหรับจัดการการลบ
  const onDelete = () => {
    Alert.alert(
      "ยืนยันการลบ",
      "คุณแน่ใจหรือไม่ว่าต้องการลบบันทึกนี้? การกระทำนี้ไม่สามารถย้อนกลับได้",
      [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ลบ",
          style: "destructive",
          onPress: async () => {
            try {
              if (id) {
                await deleteDiary(id);
                navigation.goBack();
              }
            } catch (e) {
              Alert.alert("ลบไม่สำเร็จ", e?.response?.data?.detail || "เกิดข้อผิดพลาด");
              console.error(e);
            }
          },
        },
      ]
    );
  };

  // update กิจกรรมรายวัน
  const handleActivityUpdate = (activityId, key, value) => {
    setDayActivities(currentActivities =>
      currentActivities.map(act =>
        act.id === activityId ? { ...act, [key]: value } : act
      )
    );
  };

  const formattedDate = useMemo(() => {
    try {
      return new Date(date).toLocaleDateString("th-TH", { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return date; }
  }, [date]);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" /></View>
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#555" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{id ? "แก้ไขบันทึก" : "สร้างบันทึกใหม่"}</Text>
        
        {/* 3. เพิ่มปุ่มลบและบันทึกใน Header */}
        <View style={styles.headerActions}>
          {id && (
            <TouchableOpacity onPress={onDelete} style={{ marginRight: 16 }}>
              <Ionicons name="trash-outline" size={24} color="#e74c3c" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onSave}>
            <Ionicons name="checkmark" size={28} color="#1f6f8b" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.dateText}>{formattedDate}</Text>
        
        <View style={styles.card}>
          <TextInput style={styles.titleInput} value={title} onChangeText={setTitle} placeholder="ชื่อเรื่อง..." placeholderTextColor="#ccc" />
          <View style={styles.divider} />
          <TextInput style={styles.detailInput} value={detail} onChangeText={setDetail} multiline placeholder="รายละเอียด..." placeholderTextColor="#ccc" />
        </View>

        <View style={styles.card}>
          <TouchableOpacity style={styles.moodButton} onPress={() => setMoodModalVisible(true)}>
            <Text style={styles.moodButtonText}>+ ความรู้สึกวันนี้</Text>
            <Text style={styles.moodEmoji}>{mood}</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>กิจกรรมของวันนี้</Text>
          {dayActivities.length > 0 ? dayActivities.map(act => (
            <View key={act.id} style={styles.activityItem}>
              <Ionicons name="ellipse" size={10} color="#888" style={{marginRight: 8}} />
              <Text style={styles.activityTitle} numberOfLines={1}>{act.title}</Text>
              <StarRating value={act.rating} onChange={(val) => handleActivityUpdate(act.id, 'rating', val)} />
              <TouchableOpacity onPress={() => handleActivityUpdate(act.id, 'activityMood', act.activityMood === "🙂" ? "😄" : "🙂")}>
                <Text style={styles.moodEmoji}>{act.activityMood}</Text>
              </TouchableOpacity>
            </View>
          )) : <Text style={styles.emptyText}>ไม่มีกิจกรรมในวันนี้</Text>}
        </View>
      </ScrollView>

      <Modal visible={isMoodModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>เลือกความรู้สึกวันนี้</Text>
            <View style={styles.moodPicker}>
              {MOODS.map(m => (
                <TouchableOpacity key={m} style={styles.moodOption} onPress={() => { setMood(m); setMoodModalVisible(false); }}>
                  <Text style={styles.moodEmojiOption}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center'},
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 44, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#333" },
  scrollContainer: { padding: 16, paddingBottom: 100 },
  dateText: { fontSize: 16, fontWeight: '500', color: '#555', marginBottom: 16, textAlign: 'center' },
  card: { backgroundColor: "#f9f9f9", borderRadius: 12, padding: 16, marginBottom: 16 },
  titleInput: { fontSize: 20, fontWeight: 'bold', paddingBottom: 8 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 8 },
  detailInput: { fontSize: 16, minHeight: 100, textAlignVertical: 'top' },
  moodButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  moodButtonText: { fontSize: 16, fontWeight: '600' },
  moodEmoji: { fontSize: 28, marginLeft: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  activityItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  activityTitle: { flex: 1, fontSize: 14, marginRight: 8 },
  starContainer: { flexDirection: 'row', marginRight: 8 },
  emptyText: { color: '#999', fontStyle: 'italic' },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#fff", borderRadius: 12, padding: 20, width: "85%" },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  moodPicker: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around' },
  moodOption: { padding: 10, margin: 5 },
  moodEmojiOption: { fontSize: 40 },
});