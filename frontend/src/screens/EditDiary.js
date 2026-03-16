// ============================================
// EditDiaryScreen.js - หน้าสร้าง/แก้ไขบันทึกไดอารี่
// ============================================
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Image, Modal, Dimensions, FlatList
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";

// Import API functions
import { getDiary, createDiary, updateDiary, deleteDiary, listDiaryImages, uploadDiaryImages, deleteDiaryImage } from "../api/diary";
import { listActivities } from "../api/activities";
import { BASE_URL } from "../api/client";

// Import helper functions
import { generateActivitySummary } from "../utils/summarizeActivities";
import { POSITIVE_TAGS, NEGATIVE_TAGS, emojiToTagMap } from "../constants/tags";
import { buildDiaryPayload, normalizeActivities } from "../utils/diaryPayload";
import { toDateString } from "../utils/dateUtils";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ============================================
// StarRating Component
// ============================================
const StarRating = ({ value, onChange, color = '#f5c518', large = false, disabled = false }) => (
  <View style={[styles.starContainer, large && { marginVertical: 8 }, disabled && { opacity: 0.6 }]}>
    {[1, 2, 3, 4, 5].map(i => (
      <TouchableOpacity key={i} onPress={() => onChange(i)} disabled={disabled}>
        <Ionicons
          name={i <= value ? "star" : "star-outline"}
          size={large ? 44 : 32}
          color={i <= value ? color : "#e0e0e0"}
          style={{ marginHorizontal: large ? 6 : 4 }}
        />
      </TouchableOpacity>
    ))}
  </View>
);

// ============================================
// TagRow Component
// ============================================
const TagRow = ({ options, selected, setSelected, activeColor, disabled = false }) => (
  <View style={[styles.tagRow, disabled && { opacity: 0.6 }]}>
    {options.map((tag) => {
      const active = selected.includes(tag);
      return (
        <TouchableOpacity
          key={tag}
          style={[
            styles.tagChip,
            active && { backgroundColor: activeColor + '15', borderColor: activeColor },
          ]}
          onPress={() => {
            if (disabled) return;
            setSelected((prev) =>
              active ? prev.filter((t) => t !== tag) : [...prev, tag],
            );
          }}
          disabled={disabled}
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
  const insets = useSafeAreaInsets();
  
  // --- Parameters ---
  const id = route.params?.id || null;
  const initDate = route.params?.date || new Date().toISOString().slice(0, 10);
  const isManual = route.params?.manual === true;

  // --- State Management ---
  const [isEditing, setIsEditing] = useState(!id);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [date, setDate] = useState(initDate);
  const [posScore, setPosScore] = useState(0);
  const [negScore, setNegScore] = useState(0);
  const [overall, setOverall] = useState(0);
  const [posTags, setPosTags] = useState([]);
  const [negTags, setNegTags] = useState([]);
  const [moodTags, setMoodTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [images, setImages] = useState([]);
  const [pendingImages, setPendingImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [activities, setActivities] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Viewer State
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);

  // --- API Functions ---
  const fetchImages = useCallback(async () => {
    if (!id) return;
    try {
      const res = await listDiaryImages(id);
      setImages(res?.images || []);
    } catch (err) {
      console.warn("โหลดรูปไม่สำเร็จ", err);
    }
  }, [id]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      if (id) {
        const diaryData = await getDiary(id);
        setTitle(diaryData.title);
        setDate(diaryData.date);
        setPosScore(diaryData.positive_score || 0);
        setNegScore(diaryData.negative_score || 0);
        setOverall(diaryData.mood_score || 0);
        
        const rawTags = diaryData.mood_tags || [];
        const mappedTags = rawTags.map((t) => emojiToTagMap[t]).filter(Boolean);

        setPosTags(mappedTags.filter((t) => POSITIVE_TAGS.includes(t)));
        setNegTags(mappedTags.filter((t) => NEGATIVE_TAGS.includes(t)));
        setMoodTags(rawTags.filter((t) => !emojiToTagMap[t]));
        setActivities(diaryData.activities || null);
        
        if (!diaryData.detail || diaryData.detail.trim() === "") {
          try {
            const activityData = await listActivities({ qdate: diaryData.date });
            const summary = generateActivitySummary(activityData.items || []);
            setDetail(summary);
            setActivities(normalizeActivities(activityData.items || []));
          } catch (err) {
            setDetail(diaryData.detail || "");
          }
        } else {
          setDetail(diaryData.detail);
        }
      } else {
        setDate(initDate);
        if (isManual) {
          setTitle("");
          setDetail("ความรู้สึกวันนี้:\n");
          setActivities(null);
        } else {
          try {
            const activityData = await listActivities({ qdate: initDate });
            const summary = generateActivitySummary(activityData.items || []);
            setTitle("");
            setDetail(summary);
            setActivities(normalizeActivities(activityData.items || []));
          } catch (err) {
            setTitle("");
            setDetail("");
            setActivities(null);
          }
        }
      }
    } catch (e) {
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, [id, initDate, isManual]);

  useEffect(() => {
    setIsEditing(!id);
    load();
  }, [load]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const loadActivitySummary = async () => {
    try {
      setLoadingSummary(true);
      const activityData = await listActivities({ qdate: date });
      const summary = generateActivitySummary(activityData.items || []);
      setActivities(normalizeActivities(activityData.items || []));
      
      if (detail.trim()) {
        setDetail(detail + "\n\n" + summary);
      } else {
        setDetail(summary);
      }
    } catch (e) {
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถโหลดกิจกรรมได้");
    } finally {
      setLoadingSummary(false);
    }
  };

  const pickAndUpload = async () => {
    const totalCount = images.length + pendingImages.length;
    const remaining = Math.max(0, 3 - totalCount);
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
      if (id) {
        setUploadingImages(true);
        await uploadDiaryImages(id, selected);
        await fetchImages();
      } else {
        setPendingImages((prev) => [...prev, ...selected]);
      }
    } catch (err) {
      Alert.alert("อัปโหลดไม่สำเร็จ", err?.detail || "ลองใหม่อีกครั้ง");
    } finally {
      setUploadingImages(false);
    }
  };

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
            Alert.alert("ลบไม่สำเร็จ", "ลองใหม่อีกครั้ง");
          }
        },
      },
    ]);
  };

  const onRemovePendingImage = (uri) => {
    setPendingImages((prev) => prev.filter((img) => img.uri !== uri));
  };

  const openImageViewer = (index) => {
    if (!images.length) return;
    setImageViewerIndex(index);
    setImageViewerVisible(true);
  };

  const onSave = async () => {
    if (!title.trim()) {
      Alert.alert("ข้อมูลไม่ครบถ้วน", "กรุณากรอกชื่อเรื่อง");
      return;
    }
    
    const payload = buildDiaryPayload({
      date,
      title,
      detail,
      positiveScore: posScore,
      negativeScore: negScore,
      moodScore: overall,
      positiveTags: posTags,
      negativeTags: negTags,
      extraMoodTags: moodTags,
      activities: activities ?? undefined
    });

    try {
      setLoading(true);
      if (id) {
        await updateDiary(id, payload);
      } else {
        const created = await createDiary(payload);
        const newId = created?.id;
        if (newId && pendingImages.length) {
          setUploadingImages(true);
          await uploadDiaryImages(newId, pendingImages);
        }
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert("บันทึกไม่สำเร็จ", "กรุณาตรวจสอบข้อมูลอีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = () => {
    Alert.alert("ยืนยันการลบ", "คุณแน่ใจหรือไม่ว่าต้องการลบบันทึกนี้?", [
        { text: "ยกเลิก", style: "cancel" },
        { text: "ลบ", style: "destructive", onPress: async () => {
            try {
              if (id) {
                await deleteDiary(id);
                navigation.goBack();
              }
            } catch (e) { Alert.alert("ลบไม่สำเร็จ", "เกิดข้อผิดพลาด"); }
          },
        },
      ]
    );
  };

  const formattedDate = useMemo(() => {
    try {
      return new Date(date).toLocaleDateString("th-TH", { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return date; }
  }, [date]);

  // ============================================
  // UI Rendering
  // ============================================
  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#1f6f8b" /></View>
  }

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      {/* --- Header Bar --- */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={26} color="#4A5568" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>{id ? "แก้ไขบันทึก" : "สร้างบันทึก"}</Text>
        
        <View style={styles.headerActions}>
          {id && !isEditing ? (
            <TouchableOpacity style={styles.iconButton} onPress={() => setIsEditing(true)}>
              <Ionicons name="create-outline" size={24} color="#1f6f8b" />
            </TouchableOpacity>
          ) : (
            <>
              {id && (
                <TouchableOpacity style={[styles.iconButton, { marginRight: 8 }]} onPress={onDelete}>
                  <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.saveButton} onPress={onSave}>
                <Text style={styles.saveButtonText}>บันทึก</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* --- Main Content --- */}
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={styles.dateRow}
          onPress={() => isEditing && setShowDatePicker(true)}
          disabled={!isEditing}
        >
          <Ionicons name="calendar-outline" size={16} color="#1f6f8b" style={styles.dateIcon} />
          <Text style={styles.dateText}>{formattedDate}</Text>
          {isEditing && !id && (
            <Ionicons name="chevron-down" size={16} color="#A0AEC0" />
          )}
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={new Date(date)}
            mode="date"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setDate(toDateString(selectedDate));
            }}
          />
        )}
        
        {/* --- Card 1: เนื้อหาบันทึก --- */}
        <View style={styles.card}>
          <TextInput 
            style={styles.titleInput} 
            value={title} 
            onChangeText={setTitle} 
            placeholder="ตั้งชื่อเรื่องของวันนี้..." 
            placeholderTextColor="#A0AEC0" 
            editable={isEditing}
          />
          <View style={styles.divider} />
          <TextInput 
            style={styles.detailInput} 
            value={detail} 
            onChangeText={setDetail} 
            multiline 
            placeholder="วันนี้มีเรื่องอะไรอยากเล่าให้ฟังบ้าง?..." 
            placeholderTextColor="#A0AEC0" 
            editable={isEditing}
          />
          
          {/* ปุ่มสรุปจัดกลุ่มมาอยู่ใน Card ข้อความ */}
          {isEditing && (
            <TouchableOpacity 
              style={styles.summaryBadge}
              onPress={loadActivitySummary}
              disabled={loadingSummary}
            >
              {loadingSummary ? (
                <ActivityIndicator size="small" color="#1f6f8b" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={16} color="#1f6f8b" style={{ marginRight: 6 }} />
                  <Text style={styles.summaryBadgeText}>ช่วยสรุปกิจกรรมให้หน่อย</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* --- Card 2: ประเมินวันของคุณ --- */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📊 ประเมินวันของคุณ</Text>
          
          {/* ภาพรวมทั้งวัน (เน้นเป็นกล่องใหญ่สุดอยู่บนสุด) */}
          <View style={[styles.sectionCard, styles.overallCard]}>
            <Text style={styles.overallTitle}>ความรู้สึกโดยรวมวันนี้เป็นยังไง?</Text>
            <StarRating value={overall} onChange={setOverall} large disabled={!isEditing} />
          </View>

          {/* เรื่องดี ๆ */}
          <View style={styles.sectionCard}>
            <View style={styles.scoreHeader}>
              <Text style={styles.emojiIcon}>🌟</Text>
              <Text style={styles.scoreSectionTitle}>เรื่องดี ๆ</Text>
            </View>
            <StarRating value={posScore} onChange={setPosScore} color="#52c41a" disabled={!isEditing} />
            {posScore > 0 && (
              <TagRow options={POSITIVE_TAGS} selected={posTags} setSelected={setPosTags} activeColor="#52c41a" disabled={!isEditing} />
            )}
          </View>

          {/* เรื่องแย่ ๆ */}
          <View style={styles.sectionCard}>
            <View style={styles.scoreHeader}>
              <Text style={styles.emojiIcon}>⚡</Text>
              <Text style={styles.scoreSectionTitle}>เรื่องปวดหัว</Text>
            </View>
            <StarRating value={negScore} onChange={setNegScore} color="#ff4d4f" disabled={!isEditing} />
            {negScore > 0 && (
              <TagRow options={NEGATIVE_TAGS} selected={negTags} setSelected={setNegTags} activeColor="#ff4d4f" disabled={!isEditing} />
            )}
          </View>
        </View>

        {/* --- Card 3: รูปภาพประกอบ --- */}
        <View style={styles.card}>
          <View style={styles.imagesHeader}>
            <Text style={styles.sectionTitle}>📷 รูปประกอบบันทึก</Text>
            <Text style={styles.imageCounter}>{images.length + pendingImages.length}/3</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imageRow}
            contentContainerStyle={styles.imageRowContent}
          >
            {/* ปุ่มเพิ่มรูป ให้อยู่ในแกนแนวนอนเดียวกับรูป */}
            {isEditing && (images.length + pendingImages.length) < 3 && (
              <TouchableOpacity 
                style={styles.imageAddBox}
                onPress={pickAndUpload}
                disabled={uploadingImages}
              >
                {uploadingImages ? (
                  <ActivityIndicator size="small" color="#1f6f8b" />
                ) : (
                  <>
                    <Ionicons name="camera" size={28} color="#A0AEC0" />
                    <Text style={styles.imageAddBoxText}>เพิ่มรูป</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* แสดงรูปเก่า */}
            {images.map((img, index) => (
              <View key={img.name} style={styles.imageItem}>
                <TouchableOpacity onPress={() => openImageViewer(index)}>
                  <Image source={{ uri: `${BASE_URL}${img.url}` }} style={styles.imageThumb} />
                </TouchableOpacity>
                {isEditing && (
                  <TouchableOpacity style={styles.imageDelete} onPress={() => onDeleteImage(img.name)}>
                    <Ionicons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {/* แสดงรูปใหม่ที่เพิ่งเลือก */}
            {pendingImages.map((img) => (
              <View key={img.uri} style={styles.imageItem}>
                <Image source={{ uri: img.uri }} style={styles.imageThumb} />
                {isEditing && (
                  <TouchableOpacity style={styles.imageDelete} onPress={() => onRemovePendingImage(img.uri)}>
                    <Ionicons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* --- Image Viewer Modal --- */}
      <Modal visible={imageViewerVisible} animationType="fade" transparent onRequestClose={() => setImageViewerVisible(false)}>
        <View style={styles.viewerOverlay}>
          <View style={styles.viewerHeader}>
            <Text style={styles.viewerTitle} numberOfLines={1}>รูปประกอบบันทึก</Text>
            <TouchableOpacity onPress={() => setImageViewerVisible(false)} style={styles.viewerCloseBtn}>
              <Ionicons name="close" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={images}
            horizontal
            pagingEnabled
            initialScrollIndex={imageViewerIndex}
            keyExtractor={(item) => item.name}
            showsHorizontalScrollIndicator={false}
            getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
            onMomentumScrollEnd={(event) => {
              const nextIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setImageViewerIndex(nextIndex);
            }}
            renderItem={({ item }) => (
              <ScrollView maximumZoomScale={3} minimumZoomScale={1} centerContent style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }} contentContainerStyle={styles.viewerImageContainer}>
                <Image source={{ uri: `${BASE_URL}${item.url}` }} style={styles.viewerImage} resizeMode="contain" />
              </ScrollView>
            )}
          />

          {images.length > 1 && (
            <View style={styles.viewerCounterPill}>
              <Text style={styles.viewerCounterText}>{imageViewerIndex + 1}/{images.length}</Text>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================
// Styles - การตกแต่ง UI
// ============================================
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7FAFC" }, 
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center'}, 
  
  // Header
  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#2D3748" }, 
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { padding: 4 },
  saveButton: { backgroundColor: '#1f6f8b', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  saveButtonText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  
  // Content Layout
  scrollContainer: { padding: 16, paddingBottom: 60 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  dateIcon: { marginRight: 6 },
  dateText: { fontSize: 14, fontWeight: '600', color: '#718096' },
  
  // Cards
  card: { 
    backgroundColor: "#FFFFFF", 
    borderRadius: 20, 
    padding: 20, 
    marginBottom: 20, 
    shadowColor: '#000', 
    shadowOpacity: 0.03, 
    shadowRadius: 10, 
    shadowOffset: { width: 0, height: 4 },
    elevation: 2 
  },
  
  // Text Inputs
  titleInput: { fontSize: 22, fontWeight: '700', color: '#2D3748', paddingBottom: 8 }, 
  divider: { height: 1, backgroundColor: '#EDF2F7', marginVertical: 12 }, 
  detailInput: { fontSize: 16, minHeight: 120, textAlignVertical: 'top', color: '#4A5568', lineHeight: 24 },
  
  // Summary Badge
  summaryBadge: { 
    flexDirection: 'row', 
    alignSelf: 'flex-start',
    alignItems: 'center', 
    backgroundColor: '#EBF8FF', 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 12, 
    marginTop: 12 
  },
  summaryBadgeText: { color: '#1f6f8b', fontSize: 13, fontWeight: '600' },

  // Mood Section
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, color: '#2D3748' }, 
  sectionCard: { marginBottom: 16 },
  scoreHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  emojiIcon: { fontSize: 20, marginRight: 8 },
  scoreSectionTitle: { fontSize: 15, fontWeight: '600', color: '#4A5568' }, 
  overallCard: { backgroundColor: '#F7FAFC', padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#EDF2F7' },
  overallTitle: { fontSize: 16, fontWeight: '700', color: '#2D3748', marginBottom: 12 },
  starContainer: { flexDirection: 'row', justifyContent: 'center' }, 
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tagChip: { borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#FFF' },
  tagText: { color: '#718096', fontSize: 13, fontWeight: '500' },

  // Images Section
  imagesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  imageCounter: { fontSize: 14, color: '#A0AEC0', fontWeight: '500' },
  imageRow: { flexDirection: 'row' },
  imageRowContent: { alignItems: 'center' },
  imageAddBox: { width: 90, height: 90, borderRadius: 16, backgroundColor: '#F7FAFC', borderWidth: 2, borderColor: '#EDF2F7', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  imageAddBoxText: { color: '#A0AEC0', fontSize: 12, fontWeight: '600', marginTop: 4 },
  imageItem: { marginRight: 12, position: 'relative' },
  imageThumb: { width: 90, height: 90, borderRadius: 16, backgroundColor: '#E2E8F0' },
  imageDelete: { position: 'absolute', top: -6, right: -6, backgroundColor: '#FF6B6B', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },

  // Modal ImageViewer Styles
  viewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
  viewerHeader: { position: 'absolute', top: 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, zIndex: 10 },
  viewerTitle: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  viewerCloseBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  viewerImageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  viewerImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.7 },
  viewerCounterPill: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  viewerCounterText: { color: '#FFF', fontSize: 14, fontWeight: '600' }
});