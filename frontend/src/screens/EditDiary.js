// ============================================
// EditDiaryScreen.js - หน้าสร้าง/แก้ไขบันทึกไดอารี่
// ============================================
// หน้าจอนี้ใช้สำหรับ 3 โหมด:
// 1. แก้ไขบันทึกเก่า (มี id)
// 2. สร้างบันทึกใหม่แบบ manual (กดปุ่ม +, manual=true)
// 3. สร้างบันทึกร่างอัตโนมัติ (ไม่มี id, ไม่ manual, มี date)

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'; // จัดการ safe area (notch)
import { Ionicons } from "@expo/vector-icons"; // ไอคอน

// Import API functions - เชื่อมต่อกับ backend
import { getDiary, createDiary, updateDiary, deleteDiary } from "../api/diary"; // CRUD operations สำหรับไดอารี่
import { listActivities } from "../api/activities"; // ดึงรายการกิจกรรม (สำหรับสร้างสรุป)

// Import helper functions
import { getTagsForRating } from "../moodSystem"; // แปลงคะแนนดาว (1-5) เป็นชุดแท็กอารมณ์
import { generateActivitySummary } from "../summarizeActivities"; // สร้างข้อความสรุปจากกิจกรรม

// ============================================
// StarRating Component - แสดงดาว 1-5 ดวง
// ============================================
// Props:
// - value: คะแนนปัจจุบัน (0-5)
// - onChange: callback เมื่อผู้ใช้กดเลือกดาว
const StarRating = ({ value, onChange }) => (
  <View style={styles.starContainer}>
    {[1, 2, 3, 4, 5].map(i => (
      <TouchableOpacity key={i} onPress={() => onChange(i)}>
        <Ionicons
          name={i <= value ? "star" : "star-outline"} // ดาวเต็มหรือกลวง
          size={40}
          color={i <= value ? "#f5c518" : "#ccc"} // สีเหลืองถ้าถูกเลือก
          style={{ marginHorizontal: 5 }}
        />
      </TouchableOpacity>
    ))}
  </View>
);

// ============================================
// EditDiaryScreen - Main Component
// ============================================
export default function EditDiaryScreen({ route, navigation }) {
  const insets = useSafeAreaInsets(); // ดึงค่า safe area insets (สำหรับ notch/status bar)
  
  // --- รับ Parameters จาก navigation ---
  const id = route.params?.id || null; // diary ID (null = สร้างใหม่)
  const initDate = route.params?.date || new Date().toISOString().slice(0, 10); // วันที่ (default = วันนี้)
  const isManual = route.params?.manual === true; // flag สำหรับบอกว่าเป็นการสร้างแบบ manual (กดปุ่ม +)

  // --- State Management ---
  const [title, setTitle] = useState(""); // ชื่อเรื่อง
  const [detail, setDetail] = useState(""); // รายละเอียด/เนื้อหา
  const [date, setDate] = useState(initDate); // วันที่บันทึก
  const [moodRating, setMoodRating] = useState(null); // คะแนนอารมณ์ (1-5)
  const [moodTags, setMoodTags] = useState([]); // แท็กอารมณ์ที่เลือก เช่น ['😊', '🚀']
  const [loading, setLoading] = useState(true); // สถานะการโหลด
  const [loadingSummary, setLoadingSummary] = useState(false); // สถานะการโหลดสรุปกิจกรรม

  // ============================================
  // load() - โหลดข้อมูลเมื่อเข้าหน้าจอ
  // ============================================
  // ทำงาน 3 แบบ:
  // 1. มี id → เรียก GET /diary/{id} เพื่อดึงข้อมูลบันทึกเก่ามาแก้ไข
  // 2. ไม่มี id + isManual=true → สร้างใหม่แบบว่างเปล่า (ผู้ใช้กดปุ่ม +)
  // 3. ไม่มี id + isManual=false → สร้างร่างอัตโนมัติ (เรียก listActivities แล้ว generate summary)
  const load = useCallback(async () => {
    try {
      setLoading(true);
      if (id) {
        // --- โหมดที่ 1: แก้ไขบันทึกเก่า ---
        // เรียก GET /diary/{id} จาก backend
        const diaryData = await getDiary(id);
        // นำข้อมูลที่ได้มา set ใน state
        setTitle(diaryData.title);
        setDate(diaryData.date);
        setMoodRating(diaryData.mood_score || null);
        setMoodTags(diaryData.mood_tags || []);
        
        // ✅ เพิ่ม: ถ้า detail ว่างเปล่า ให้ดึงกิจกรรมมาสรุปให้
        if (!diaryData.detail || diaryData.detail.trim() === "") {
          try {
            const activityData = await listActivities({ qdate: diaryData.date });
            const summary = generateActivitySummary(activityData.items || []);
            setDetail(summary);
          } catch (err) {
            console.warn("Failed to load activities for summary", err);
            setDetail(diaryData.detail || "");
          }
        } else {
          setDetail(diaryData.detail);
        }
      } else {
        // --- โหมดที่ 2 & 3: สร้างบันทึกใหม่ ---
        setDate(initDate);
        if (isManual) {
          // 2a: สร้างแบบ manual (กดปุ่ม +) - เริ่มต้นว่างเปล่า
          setTitle("");
          setDetail("ความรู้สึกวันนี้:\n");
        } else {
          // 2b: สร้างร่างอัตโนมัติ (ระบบเรียกเอง)
          // เรียก GET /activities?qdate={initDate} เพื่อดึงกิจกรรมของวันนั้น
          const activityData = await listActivities({ qdate: initDate });
          // ส่งกิจกรรมไปให้ generateActivitySummary สร้างข้อความสรุป
          const summary = generateActivitySummary(activityData.items || []);
          setTitle(""); // ให้ผู้ใช้ตั้งชื่อเอง
          setDetail(summary); // เติมสรุปให้
        }
      }
    } catch (e) {
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลได้");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id, initDate, isManual]);

  // เรียก load() เมื่อ component mount หรือ dependencies เปลี่ยน
  useEffect(() => {
    load();
  }, [load]);

  // ============================================
  // loadActivitySummary() - โหลดและสรุปกิจกรรม
  // ============================================
  const loadActivitySummary = async () => {
    try {
      setLoadingSummary(true);
      const activityData = await listActivities({ qdate: date });
      const summary = generateActivitySummary(activityData.items || []);
      
      // เติมสรุปเข้าไปใน detail (ไม่เขียนทับ ถ้ามีอยู่แล้วให้เพิ่มต่อท้าย)
      if (detail.trim()) {
        setDetail(detail + "\n\n" + summary);
      } else {
        setDetail(summary);
      }
    } catch (e) {
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถโหลดกิจกรรมได้");
      console.error(e);
    } finally {
      setLoadingSummary(false);
    }
  };

  // ============================================
  // onSave() - บันทึกข้อมูลไดอารี่
  // ============================================
  // สร้าง payload และส่งไป backend:
  // - มี id → เรียก PUT /diary/{id} (อัปเดต)
  // - ไม่มี id → เรียก POST /diary (สร้างใหม่)
  const onSave = async () => {
    // ตรวจสอบว่ามีชื่อเรื่อง
    if (!title.trim()) {
      Alert.alert("ข้อมูลไม่ครบถ้วน", "กรุณากรอกชื่อเรื่อง");
      return;
    }
    
    // สร้าง payload object สำหรับส่งไป backend
    const payload = {
      date,                      // วันที่บันทึก (YYYY-MM-DD)
      time: "00:00:00",          // เวลา (default 00:00:00 เพราะ diary ไม่ใช้เวลาจริง)
      title: title.trim(),       // ชื่อเรื่อง
      detail: detail.trim(),     // รายละเอียด
      mood_score: moodRating,    // คะแนนดาว 1-5 (หรือ null)
      mood_tags: moodTags,       // array ของ emoji tags เช่น ['😊', '🚀']
    };

    try {
      setLoading(true);
      if (id) {
        // มี id = แก้ไขบันทึกเก่า → PUT /diary/{id}
        await updateDiary(id, payload);
      } else {
        // ไม่มี id = สร้างใหม่ → POST /diary
        await createDiary(payload);
      }
      // บันทึกสำเร็จ → กลับไปหน้าก่อน (DiaryScreen)
      navigation.goBack();
    } catch (e) {
      Alert.alert("บันทึกไม่สำเร็จ", "กรุณาตรวจสอบข้อมูลอีกครั้ง");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // onDelete() - ลบบันทึก
  // ============================================
  // แสดง confirmation dialog แล้วเรียก DELETE /diary/{id}
  const onDelete = () => {
    Alert.alert("ยืนยันการลบ", "คุณแน่ใจหรือไม่ว่าต้องการลบบันทึกนี้?", [
        { text: "ยกเลิก", style: "cancel" },
        { text: "ลบ", style: "destructive", onPress: async () => {
            try {
              if (id) {
                await deleteDiary(id); // เรียก DELETE /diary/{id}
                navigation.goBack();   // กลับหน้าก่อน
              }
            } catch (e) { Alert.alert("ลบไม่สำเร็จ", "เกิดข้อผิดพลาด"); }
          },
        },
      ]
    );
  };

  // ============================================
  // formattedDate - แปลงวันที่เป็นรูปแบบไทย
  // ============================================
  // useMemo เพื่อไม่ให้คำนวณซ้ำถ้า date ไม่เปลี่ยน
  // แปลง "2025-11-19" → "19 พฤศจิกายน 2568"
  const formattedDate = useMemo(() => {
    try {
      return new Date(date).toLocaleDateString("th-TH", { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return date; }
  }, [date]);

  // ============================================
  // UI Rendering
  // ============================================
  
  // แสดง loading spinner ขณะโหลดข้อมูล
  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" /></View>
  }

  return (
    // SafeAreaView - จัดการ safe area (notch/status bar) โดยใช้ edges={['top']}
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* ============================================ */}
      {/* Header Bar - แถบด้านบน */}
      {/* ============================================ */}
      <View style={styles.header}>
        {/* ปุ่ม X - ปิดหน้าจอ */}
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#555" />
        </TouchableOpacity>
        
        {/* ชื่อหน้าจอ - แสดงตามโหมด (แก้ไข/สร้างใหม่) */}
        <Text style={styles.headerTitle}>{id ? "แก้ไขบันทึก" : "สร้างบันทึกใหม่"}</Text>
        
        {/* Actions ขวามือ */}
        <View style={styles.headerActions}>
          {/* ปุ่มลบ - แสดงเฉพาะตอนแก้ไข (มี id) */}
          {id && (
            <TouchableOpacity onPress={onDelete} style={{ marginRight: 16 }}>
              <Ionicons name="trash-outline" size={24} color="#e74c3c" />
            </TouchableOpacity>
          )}
          {/* ปุ่ม ✓ - บันทึก */}
          <TouchableOpacity onPress={onSave}>
            <Ionicons name="checkmark" size={28} color="#1f6f8b" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ============================================ */}
      {/* ScrollView - พื้นที่เนื้อหาหลัก */}
      {/* ============================================ */}
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* แสดงวันที่ (รูปแบบไทย) */}
        <Text style={styles.dateText}>{formattedDate}</Text>
        
        {/* ============================================ */}
        {/* Card 1: ชื่อเรื่อง + รายละเอียด */}
        {/* ============================================ */}
        <View style={styles.card}>
          {/* TextInput สำหรับชื่อเรื่อง */}
          <TextInput 
            style={styles.titleInput} 
            value={title} 
            onChangeText={setTitle} 
            placeholder="ชื่อเรื่อง..." 
            placeholderTextColor="#ccc" 
          />
          <View style={styles.divider} />
          {/* TextInput สำหรับรายละเอียด (multiline) */}
          <TextInput 
            style={styles.detailInput} 
            value={detail} 
            onChangeText={setDetail} 
            multiline 
            placeholder="รายละเอียด..." 
            placeholderTextColor="#ccc" 
          />
        </View>

        {/* ============================================ */}
        {/* ปุ่มสรุปกิจกรรม */}
        {/* ============================================ */}
        <TouchableOpacity 
          style={styles.summaryButton}
          onPress={loadActivitySummary}
          disabled={loadingSummary}
        >
          {loadingSummary ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="list" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.summaryButtonText}>สรุปกิจกรรมของวันนี้</Text>
            </>
          )}
        </TouchableOpacity>

        {/* ============================================ */}
        {/* Card 2: 2D Mood System (ดาว + แท็ก) */}
        {/* ============================================ */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📊 ประเมินวันของคุณ</Text>
          
          {/* มิติที่ 1: Star Rating (1-5) */}
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', marginBottom: 8 }}>ให้คะแนนวันนี้ (1-5)</Text>
            {/* StarRating component - ผู้ใช้เลือกดาว 1-5 */}
            <StarRating 
              value={moodRating || 0} 
              onChange={(v) => { 
                setMoodRating(v);    // บันทึกคะแนนใหม่
                setMoodTags([]);     // ล้างแท็กเก่า (เพราะแต่ละคะแนนมีแท็กต่างกัน)
              }} 
            />
          </View>

          {/* แสดงแท็กที่เลือกไว้แล้ว (ถ้ามี) */}
          {moodTags.length > 0 && (
            <View style={styles.selectedTagsSection}>
              <Text style={styles.selectedTagsTitle}>แท็กที่เลือก:</Text>
              <View style={styles.selectedTagsRow}>
                {moodTags.map((tag, idx) => (
                  <View key={idx} style={styles.selectedTag}>
                    <Text style={styles.selectedTagEmoji}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* มิติที่ 2: Emoji Tags - แสดงเฉพาะเมื่อเลือกดาวแล้ว */}
          {moodRating && (
            <View style={styles.moodTagsSection}>
              <Text style={styles.moodTagsTitle}>เพราะอะไรถึงรู้สึกแบบนั้น? (เลือกได้หลายอัน):</Text>
              <View style={styles.moodTagsGrid}>
                {/* getTagsForRating(moodRating) คืน array ของ {emoji, label} ตามคะแนนดาว */}
                {getTagsForRating(moodRating).map((tag) => {
                  const isSelected = moodTags.includes(tag.emoji); // เช็คว่าแท็กนี้ถูกเลือกหรือยัง
                  return (
                    <TouchableOpacity
                      key={tag.emoji}
                      style={[styles.moodTag, isSelected && styles.moodTagSelected]} // เปลี่ยนสีถ้าถูกเลือก
                      onPress={() => {
                        if (isSelected) {
                          // ถ้าเลือกอยู่แล้ว → ยกเลิก (filter ออก)
                          setMoodTags(moodTags.filter(t => t !== tag.emoji));
                        } else {
                          // ถ้ายังไม่เลือก → เพิ่มเข้าไป
                          setMoodTags([...moodTags, tag.emoji]);
                        }
                      }}
                    >
                      <Text style={styles.moodTagEmoji}>{tag.emoji}</Text>
                      <Text style={[styles.moodTagLabel, isSelected && { color: '#fff' }]}>{tag.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>
        
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================
// Styles - การตกแต่ง UI
// ============================================
const styles = StyleSheet.create({
  // Layout หลัก
  screen: { flex: 1, backgroundColor: "#fff" },                                    // พื้นหลังขาว เต็มหน้าจอ
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center'},            // สำหรับแสดง loading (กึ่งกลาง)
  
  // Header bar (แถบด้านบน)
  header: { 
    flexDirection: "row",                    // จัดเป็นแถวนอน (X | Title | Actions)
    justifyContent: "space-between",         // แยกซ้าย-กลาง-ขวา
    alignItems: "center",                    // จัดกลางแนวตั้ง
    paddingHorizontal: 16,                   // ช่องว่างซ้าย-ขวา
    paddingTop: 8, 
    paddingBottom: 12, 
    borderBottomWidth: 1,                    // เส้นขีดใต้
    borderBottomColor: "#f0f0f0" 
  },
  headerActions: { flexDirection: 'row', alignItems: 'center' },                   // จัดปุ่มขวามือ (ลบ + บันทึก)
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#333" },                 // ชื่อหน้าจอ
  
  // ScrollView content
  scrollContainer: { padding: 16, paddingBottom: 100 },                            // ช่องว่างรอบๆ + space ล่างสุด
  dateText: { fontSize: 16, fontWeight: '500', color: '#555', marginBottom: 8, textAlign: 'center' }, // แสดงวันที่
  
  // Card - กล่องสำหรับแต่ละส่วน
  card: { backgroundColor: "#f9f9f9", borderRadius: 12, padding: 16, marginBottom: 16 }, // พื้นหลังเทา มุมมน
  
  // Input fields
  titleInput: { fontSize: 20, fontWeight: 'bold', paddingBottom: 8 },             // ชื่อเรื่อง (ตัวหนา)
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 8 },             // เส้นแบ่ง
  detailInput: { fontSize: 16, minHeight: 150, textAlignVertical: 'top' },        // รายละเอียด (multiline, ความสูงขั้นต่ำ)
  
  // Mood section
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },           // หัวข้อ "ประเมินวันของคุณ"
  starContainer: { flexDirection: 'row', justifyContent: 'center' },              // จัดดาว 5 ดวงแนวนอน กึ่งกลาง
  
  // Selected tags display
  selectedTagsSection: {
    marginTop: 12,
    marginBottom: 8,
  },
  selectedTagsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f6f8b',
    marginBottom: 8,
  },
  selectedTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedTag: {
    backgroundColor: '#e8f4f8',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectedTagEmoji: {
    fontSize: 20,
  },
  
  // Mood tags section (แสดงเมื่อเลือกดาวแล้ว)
  moodTagsSection: {
    borderTopWidth: 1,                       // เส้นขีดบน
    borderTopColor: '#eee',
    marginTop: 16,
    paddingTop: 16,
  },
  moodTagsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 12,
  },
  moodTagsGrid: {
    flexDirection: 'row',                    // จัดแท็กแนวนอน
    flexWrap: 'wrap',                        // ขึ้นบรรทัดใหม่ถ้าเต็ม
    gap: 8,                                  // ช่องว่างระหว่างแท็ก (React Native 0.71+)
  },
  
  // แต่ละแท็ก emoji
  moodTag: {
    flexDirection: 'row',                    // emoji + label แนวนอน
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,                        // มุมมน (pill shape)
    backgroundColor: '#fff',                 // พื้นขาว (default)
    borderWidth: 1,
    borderColor: '#ddd',
  },
  moodTagSelected: {
    backgroundColor: '#1f6f8b',              // เปลี่ยนเป็นสีน้ำเงินเมื่อเลือก
    borderColor: '#1f6f8b',
  },
  moodTagEmoji: {
    fontSize: 18,
    marginRight: 4,
  },
  moodTagLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',                           // สีดำ (default) / เปลี่ยนเป็นขาวเมื่อเลือก (ใน JSX)
  },
  
  // ปุ่มสรุปกิจกรรม
  summaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f6f8b',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#1f6f8b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  summaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});