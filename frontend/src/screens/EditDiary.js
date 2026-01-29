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
  StyleSheet, Alert, ActivityIndicator, Image
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'; // จัดการ safe area (notch)
import { Ionicons } from "@expo/vector-icons"; // ไอคอน
import * as ImagePicker from "expo-image-picker";

// Import API functions - เชื่อมต่อกับ backend
import { getDiary, createDiary, updateDiary, deleteDiary, listDiaryImages, uploadDiaryImages, deleteDiaryImage } from "../api/diary"; // CRUD operations สำหรับไดอารี่
import { listActivities } from "../api/activities"; // ดึงรายการกิจกรรม (สำหรับสร้างสรุป)
import { BASE_URL } from "../api/client";

// Import helper functions
import { getTagsForRating } from "../moodSystem"; // แปลงคะแนนดาว (1-5) เป็นชุดแท็กอารมณ์
import { generateActivitySummary } from "../summarizeActivities"; // สร้างข้อความสรุปจากกิจกรรม

// ============================================
// StarRating Component - แสดงดาว 1-5 ดวง
// ============================================
// Props:
// - value: คะแนนปัจจุบัน (0-5)
// - onChange: callback เมื่อผู้ใช้กดเลือกดาว
// - color: สีของดาว (default: '#f5c518')
// - large: ขยายขนาดดาว (สำหรับภาพรวม)
const StarRating = ({ value, onChange, color = '#f5c518', large = false }) => (
  <View style={[styles.starContainer, large && { marginVertical: 8 }]}>
    {[1, 2, 3, 4, 5].map(i => (
      <TouchableOpacity key={i} onPress={() => onChange(i)}>
        <Ionicons
          name={i <= value ? "star" : "star-outline"} // ดาวเต็มหรือกลวง
          size={large ? 44 : 32}
          color={i <= value ? color : "#e0e0e0"} // สีตามที่กำหนด
          style={{ marginHorizontal: large ? 6 : 4 }}
        />
      </TouchableOpacity>
    ))}
  </View>
);

// ============================================
// TagRow Component - แสดงแถว tags ให้เลือก
// ============================================
const TagRow = ({ options, selected, setSelected, activeColor }) => (
  <View style={styles.tagRow}>
    {options.map((tag) => {
      const active = selected.includes(tag);
      return (
        <TouchableOpacity
          key={tag}
          style={[
            styles.tagChip,
            active && { backgroundColor: activeColor + '20', borderColor: activeColor },
          ]}
          onPress={() =>
            setSelected((prev) =>
              active ? prev.filter((t) => t !== tag) : [...prev, tag],
            )
          }
        >
          <Text style={[styles.tagText, active && { color: activeColor, fontWeight: '700' }]}>
            {tag}
          </Text>
        </TouchableOpacity>
      );
    })}
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
  // 3D Score System - ตรงกับ YesterdayDiaryModal
  const [posScore, setPosScore] = useState(0); // คะแนนเรื่องดี 0-5
  const [negScore, setNegScore] = useState(0); // คะแนนเรื่องแย่ 0-5
  const [overall, setOverall] = useState(0); // คะแนนภาพรวม 0-5
  // Tag system - ตรงกับ YesterdayDiaryModal
  const [posTags, setPosTags] = useState([]); // แท็กด้านดี
  const [negTags, setNegTags] = useState([]); // แท็กด้านแย่
  const [moodTags, setMoodTags] = useState([]); // แท็กเพิ่มเติม (legacy)
  const [loading, setLoading] = useState(true); // สถานะการโหลด
  const [loadingSummary, setLoadingSummary] = useState(false); // สถานะการโหลดสรุปกิจกรรม
  const [images, setImages] = useState([]); // รูปที่แนบกับบันทึก (จาก server)
  const [uploadingImages, setUploadingImages] = useState(false); // สถานะอัปโหลดรูป

  // Tag options - ตรงกับ YesterdayDiaryModal
  const POSITIVE_TAGS = ['ของกินอร่อย', 'งานเสร็จ', 'พักผ่อน', 'แฟนน่ารัก', 'ออกกำลังกาย'];
  const NEGATIVE_TAGS = ['รถติด', 'โดนดุ', 'นอนน้อย', 'ป่วย', 'ทะเลาะกัน', 'งานเดือด'];

  const tagEmojiMap = {
    'ของกินอร่อย': '🍜',
    'งานเสร็จ': '✅',
    'พักผ่อน': '🛌',
    'แฟนน่ารัก': '💖',
    'ออกกำลังกาย': '💪',
    'รถติด': '🚗',
    'โดนดุ': '😓',
    'นอนน้อย': '😴',
    'ป่วย': '🤒',
    'ทะเลาะกัน': '⚡',
    'งานเดือด': '🔥',
  };

  const toEmojis = (tags) => tags.map((t) => tagEmojiMap[t]).filter(Boolean);

  // ============================================
  // fetchImages() - โหลดไฟล์รูปของบันทึก
  // ============================================
  const fetchImages = useCallback(async () => {
    if (!id) return;
    try {
      const res = await listDiaryImages(id);
      setImages(res?.images || []);
    } catch (err) {
      console.warn("โหลดรูปไม่สำเร็จ", err);
    }
  }, [id]);

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
        // โหลด 3 คะแนน
        setPosScore(diaryData.positive_score || 0);
        setNegScore(diaryData.negative_score || 0);
        setOverall(diaryData.mood_score || 0);
        // โหลด tags (เก็บทั้งหมดเป็น emoji แล้ว)
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

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

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
  // pickAndUpload() - เลือกและอัปโหลดรูปภาพ (สูงสุด 3 รูป)
  // ============================================
  const pickAndUpload = async () => {
    if (!id) {
      Alert.alert("ยังไม่มีรหัสบันทึก", "กรุณาบันทึกไดอารี่ก่อนแนบรูป");
      return;
    }

    const remaining = Math.max(0, 3 - images.length);
    if (remaining <= 0) {
      Alert.alert("อัปโหลดครบแล้ว", "บันทึกนี้แนบรูปได้สูงสุด 3 รูป");
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("ต้องการสิทธิ์เข้าถึงรูปภาพ", "กรุณาอนุญาตให้แอปเข้าถึงคลังรูปภาพ");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });

    if (result.canceled) return;
    const selected = result.assets?.slice(0, remaining) || [];
    if (!selected.length) return;

    try {
      setUploadingImages(true);
      await uploadDiaryImages(id, selected);
      await fetchImages();
    } catch (err) {
      console.error(err);
      Alert.alert("อัปโหลดไม่สำเร็จ", err?.detail || "ลองใหม่อีกครั้ง");
    } finally {
      setUploadingImages(false);
    }
  };

  // ============================================
  // onDeleteImage() - ลบไฟล์รูปจากบันทึก
  // ============================================
  const onDeleteImage = async (filename) => {
    Alert.alert("ลบรูปนี้?", "ยืนยันการลบรูปออกจากบันทึก", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDiaryImage(id, filename);
            await fetchImages();
          } catch (err) {
            console.error(err);
            Alert.alert("ลบไม่สำเร็จ", "ลองใหม่อีกครั้ง");
          }
        },
      },
    ]);
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
      positive_score: posScore || null,  // คะแนนเรื่องดี 0-5
      negative_score: negScore || null,  // คะแนนเรื่องแย่ 0-5
      mood_score: overall || null,       // คะแนนภาพรวม 0-5
      mood_tags: [...toEmojis(posTags), ...toEmojis(negTags), ...moodTags], // รวม tags ทั้งหมด
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
        {/* Card: รูปประกอบบันทึก */}
        {/* ============================================ */}
        {id && (
          <View style={styles.card}>
            <View style={styles.imagesHeader}>
              <Text style={styles.sectionTitle}>📷 รูปประกอบ</Text>
              <TouchableOpacity
                style={[styles.imageAddButton, (uploadingImages || images.length >= 3) && { opacity: 0.5 }]}
                onPress={pickAndUpload}
                disabled={uploadingImages || images.length >= 3}
              >
                {uploadingImages ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="image-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.imageAddText}>เพิ่มรูป ({Math.max(0, 3 - images.length)} ที่เหลือ)</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {images.length === 0 ? (
              <Text style={styles.hintText}>ยังไม่มีรูปแนบ</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
                {images.map((img) => (
                  <View key={img.name} style={styles.imageItem}>
                    <Image source={{ uri: `${BASE_URL}${img.url}` }} style={styles.imageThumb} />
                    <TouchableOpacity style={styles.imageDelete} onPress={() => onDeleteImage(img.name)}>
                      <Ionicons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
            <Text style={styles.hintText}>อัปโหลดได้สูงสุด 3 รูป (jpg/png/webp)</Text>
          </View>
        )}

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
        {/* Card 2: 3D Mood System (เหมือน YesterdayDiaryModal) */}
        {/* ============================================ */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📊 ประเมินวันของคุณ</Text>
          
          {/* ส่วนที่ 1: เรื่องดีๆ */}
          <View style={styles.sectionCard}>
            <Text style={styles.scoreSectionTitle}>เรื่องดี ๆ</Text>
            <StarRating value={posScore} onChange={setPosScore} color="#52c41a" />
            {posScore > 0 && (
              <TagRow
                options={POSITIVE_TAGS}
                selected={posTags}
                setSelected={setPosTags}
                activeColor="#52c41a"
              />
            )}
          </View>

          <View style={styles.scoreDivider} />

          {/* ส่วนที่ 2: เรื่องแย่ๆ */}
          <View style={styles.sectionCard}>
            <Text style={styles.scoreSectionTitle}>เรื่องแย่ ๆ</Text>
            <StarRating value={negScore} onChange={setNegScore} color="#ff4d4f" />
            {negScore > 0 && (
              <TagRow
                options={NEGATIVE_TAGS}
                selected={negTags}
                setSelected={setNegTags}
                activeColor="#ff4d4f"
              />
            )}
          </View>

          <View style={styles.scoreDivider} />

          {/* ส่วนที่ 3: ภาพรวมทั้งวัน (เด่นสุด) */}
          <View style={styles.sectionCard}>
            <Text style={[styles.scoreSectionTitle, { textAlign: 'center', fontSize: 16, fontWeight: '700' }]}>ภาพรวมทั้งวัน</Text>
            <StarRating value={overall} onChange={setOverall} large />
            <Text style={styles.hintText}>ให้คะแนน 1–5 ดาว</Text>
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
  sectionCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  scoreSection: { marginVertical: 8 },                                             // ส่วนย่อยแต่ละมิติ
  scoreSectionTitle: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 }, // หัวข้อส่วนย่อย
  scoreDivider: { height: 1, backgroundColor: '#e6e6e6', marginVertical: 12 },   // เส้นแบ่งระหว่างส่วน
  starContainer: { flexDirection: 'row', justifyContent: 'center' },              // จัดดาว 5 ดวงแนวนอน กึ่งกลาง
  hintText: { textAlign: 'center', color: '#888', fontSize: 12, marginTop: 6 },  // คำใบ้ใต้ดาวภาพรวม
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, justifyContent: 'center' },
  tagChip: { borderWidth: 1, borderColor: '#ddd', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f9f9f9', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  tagText: { color: '#888', fontSize: 13 },

  // Images block
  imagesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  imageAddButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f6f8b', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  imageAddText: { color: '#fff', fontWeight: '700' },
  imageRow: { marginTop: 8 },
  imageItem: { marginRight: 12, position: 'relative' },
  imageThumb: { width: 96, height: 96, borderRadius: 12, backgroundColor: '#e6e6e6' },
  imageDelete: { position: 'absolute', top: -8, right: -8, backgroundColor: '#e74c3c', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  
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
    borderTopColor: '#e6e6e6',
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