import React, { useState, useCallback, useRef } from "react";
import { View, Text, SectionList, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions, Modal, Image, Alert, FlatList, ScrollView } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { listDiaries, listDiaryImages } from "../api"; 
import { toDateString } from "../utils/dateUtils"; 
import YesterdayDiaryModal from '../components/YesterdayDiaryModal'; 
import { emojiToTagMap } from "../constants/tags";
import { BASE_URL } from "../api/client";

const THEME_COLOR = "#1f6f8b"; // สีหลัก
const BG_COLOR = "#F7F9FC"; // สีพื้นหลังใหม่อ่อนสบายตา
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const MONTHS = [ "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค." ];
const DAYS = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];

// --- Components: Star Display ---
const StarDisplay = ({ score }) => {
  if (!score) return <Text style={styles.textNoScore}>ยังไม่ระบุความรู้สึก</Text>;
  return (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons 
          key={i} 
          name={i <= score ? "star" : "star-outline"} 
          size={14} 
          color={i <= score ? "#FFD700" : "#D1D5DB"} 
          style={{ marginRight: 2 }}
        />
      ))}
    </View>
  );
};

// --- Components: Diary Card ---
function DiaryCard({ item, onPress, onPressImages }) {
  const isDraft = item.isDraft;
  
  return (
    <TouchableOpacity 
      style={[styles.cardContainer, isDraft && styles.cardDraft]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Decorative Left Line */}
      <View style={[styles.accentLine, isDraft && styles.accentLineDraft]} />

      <View style={styles.cardContent}>
        {/* Header: Title & Icon */}
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, isDraft && styles.textDraftTitle]} numberOfLines={1}>
            {item.title || (isDraft ? "วันนี้เป็นอย่างไรบ้าง?" : "ไม่มีชื่อเรื่อง")}
          </Text>
          <View style={styles.cardHeaderRight}>
            {!isDraft && item.image_count > 0 && (
              <TouchableOpacity
                style={styles.imageQuickButton}
                onPress={onPressImages}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="images-outline" size={18} color={THEME_COLOR} />
              </TouchableOpacity>
            )}
            <Ionicons 
              name={isDraft ? "create-outline" : "chevron-forward"} 
              size={20} 
              color={isDraft ? THEME_COLOR : "#B0B0B0"} 
            />
          </View>
        </View>

        {/* Body: Notes */}
        <Text style={styles.cardDetail} numberOfLines={2}>
          {item.detail || (isDraft ? "แตะเพื่อเขียนเรื่องราวของคุณ..." : "")}
        </Text>

        {/* Footer: Mood & Tags (Only for non-drafts) */}
        {!isDraft && (
          <View style={styles.cardFooter}>
            <StarDisplay score={item.mood_score} />
            
            {item.mood_tags && item.mood_tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {item.mood_tags.slice(0, 3).map((tag, idx) => {
                  const label = emojiToTagMap[tag];
                  const displayTag = label ? `${tag} ${label}` : tag;
                  return (
                  <View key={idx} style={styles.tagBadge}>
                    <Text style={styles.tagText}>{displayTag}</Text>
                  </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Draft Badge */}
        {isDraft && (
            <View style={styles.draftBadge}>
                <Ionicons name="time-outline" size={12} color="#fff" style={{marginRight: 4}}/>
                <Text style={styles.draftBadgeText}>รอเขียนบันทึก</Text>
            </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// --- Main Screen ---
export default function DiaryScreen() {
  const navigation = useNavigation();
  const today = new Date();
  
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showYesterdayModal, setShowYesterdayModal] = useState(false);
  const [yesterdayISO, setYesterdayISO] = useState('');
  const hasCheckedYesterday = useRef(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerLoading, setImageViewerLoading] = useState(false);
  const [imageViewerImages, setImageViewerImages] = useState([]);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const [imageViewerTitle, setImageViewerTitle] = useState("");

  // ... (Logic ส่วนเดิม: checkAndCreateDrafts, loadData, useFocusEffect ยังคงเดิม) ...
  const checkAndCreateDrafts = (diaries) => {
    const missingDays = [];
    const checkLimit = 4;
    for (let i = 1; i <= checkLimit; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = toDateString(d);
      const exists = diaries.some(diary => diary.date === dateStr);
      if (!exists) {
        missingDays.push({
          id: `draft-${dateStr}`, date: dateStr, title: "", detail: "", mood_score: 0, isDraft: true,
        });
      }
    }
    return [...missingDays, ...diaries];
  };

  const loadData = useCallback(async (forceCheck = false) => {
    setLoading(true);
    try {
      const startDate = new Date(year, selectedMonth, 1).toISOString().slice(0, 10);
      const endDate = new Date(year, selectedMonth + 1, 0).toISOString().slice(0, 10);
      let diaries = await listDiaries({ startDate, endDate });

      if (year === today.getFullYear() && selectedMonth === today.getMonth()) {
        // ตรวจสอบว่าเป็นผู้ใช้ใหม่หรือไม่ (ยังไม่มีบันทึกเลย)
        const isNewUser = diaries.length === 0;

        if (!isNewUser) {
          // ผู้ใช้เก่า - เช็ค yesterday modal และสร้าง drafts
          const yesterday = new Date();
          yesterday.setDate(today.getDate() - 1);
          const yStr = toDateString(yesterday);
          const hasYesterday = diaries.some(d => d.date === yStr);

          if (!hasYesterday && (!hasCheckedYesterday.current || forceCheck)) {
              setYesterdayISO(yStr);
              setShowYesterdayModal(true);
              hasCheckedYesterday.current = true; 
          }
          
          diaries = checkAndCreateDrafts(diaries);
          setPendingCount(diaries.filter(d => d.isDraft).length);
        } else {
          // ผู้ใช้ใหม่ - ไม่สร้าง drafts, ไม่แสดง yesterday modal
          setPendingCount(0);
        }
      }
      
      const groupedData = diaries.reduce((acc, diary) => {
        const dateKey = diary.date;
        if (!acc[dateKey]) acc[dateKey] = { title: dateKey, data: [] };
        acc[dateKey].data.push(diary);
        return acc;
      }, {});
      
      const sortedSections = Object.values(groupedData).sort((a, b) => new Date(b.title) - new Date(a.title));
      setSections(sortedSections);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [selectedMonth, year]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // Helper สำหรับเปลี่ยนเดือน
  const changeMonth = (increment) => {
    let newMonth = selectedMonth + increment;
    let newYear = year;
    if (newMonth > 11) { newMonth = 0; newYear++; }
    else if (newMonth < 0) { newMonth = 11; newYear--; }
    setSelectedMonth(newMonth);
    setYear(newYear);
  };

  const formatSectionHeader = (dateString) => {
    const d = new Date(dateString);
    const day = d.getDate();
    const dayName = DAYS[d.getDay()];
    const monthName = MONTHS[d.getMonth()];
    const isToday = toDateString(new Date()) === dateString;
    return { day, dayName, monthName, isToday };
  };

  const openImageViewer = async (diary) => {
    if (!diary?.id) return;
    setImageViewerVisible(true);
    setImageViewerLoading(true);
    setImageViewerImages([]);
    setImageViewerIndex(0);
    setImageViewerTitle(diary.title || diary.date || "รูปภาพ");

    try {
      const res = await listDiaryImages(diary.id);
      const images = res?.images || [];
      if (!images.length) {
        setImageViewerVisible(false);
        Alert.alert("ไม่มีรูปภาพ", "บันทึกนี้ยังไม่มีรูปแนบ");
        return;
      }
      setImageViewerImages(images);
    } catch (err) {
      console.error(err);
      setImageViewerVisible(false);
      Alert.alert("โหลดรูปไม่สำเร็จ", "ลองใหม่อีกครั้ง");
    } finally {
      setImageViewerLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 1. Header & Month Navigator */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ไดอารี่ของฉัน</Text>
        <View style={styles.monthSelector}>
            <TouchableOpacity style={styles.navBtn} onPress={() => changeMonth(-1)}>
                <Ionicons name="chevron-back" size={20} color={THEME_COLOR} />
            </TouchableOpacity>
            <View style={styles.monthCapsule}>
                <Ionicons name="calendar-outline" size={16} color={THEME_COLOR} style={{marginRight:6}} />
                <Text style={styles.monthText}>{MONTHS[selectedMonth]} {year+543}</Text>
            </View>
            <TouchableOpacity style={styles.navBtn} onPress={() => changeMonth(1)}>
                <Ionicons name="chevron-forward" size={20} color={THEME_COLOR} />
            </TouchableOpacity>
        </View>
      </View>

      {/* 2. Pending Tasks Banner */}
      {pendingCount > 0 && (
        <View style={styles.reminderBanner}>
          <View style={styles.reminderIconBox}>
             <Ionicons name="sparkles" size={18} color="#FFF" />
          </View>
          <View style={{flex:1}}>
             <Text style={styles.reminderTitle}>คุณมี {pendingCount} วันที่ยังว่างอยู่</Text>
             <Text style={styles.reminderSub}>มาเติมเต็มความทรงจำกันเถอะ</Text>
          </View>
          <TouchableOpacity 
            style={styles.reminderBtn}
            onPress={() => {
                const firstDraft = sections.flatMap(sec => sec.data).find(d => d.isDraft);
                if(firstDraft) { setYesterdayISO(firstDraft.date); setShowYesterdayModal(true); }
            }}
          >
            <Text style={styles.reminderBtnText}>เขียนเลย</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 3. Main List */}
      {loading ? (
        <ActivityIndicator size="large" color={THEME_COLOR} style={{ marginTop: 40 }} />
      ) : sections.length === 0 ? (
        <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={80} color="#E1E8ED" />
            <Text style={styles.emptyText}>เดือนนี้ยังโล่งอยู่เลย...</Text>
            <Text style={styles.emptySubText}>เริ่มเขียนบันทึกแรกของคุณวันนี้สิ</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
          contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20 }}
          stickySectionHeadersEnabled={false} // ปิด sticky เพื่อความสวยงามแบบ Timeline
          renderSectionHeader={({ section: { title } }) => {
            const { day, dayName, monthName, isToday } = formatSectionHeader(title);
            return (
              <View style={styles.timelineHeader}>
                 <View style={[styles.dateCircle, isToday && styles.dateCircleToday]}>
                    <Text style={[styles.dateNumber, isToday && styles.dateNumberToday]}>{day}</Text>
                 </View>
                 <View style={styles.dateMeta}>
                    <Text style={styles.dateDayName}>{isToday ? "วันนี้" : dayName}</Text>
                    <Text style={styles.dateMonthYear}>{monthName} {year+543}</Text>
                 </View>
              </View>
            );
          }}
          renderItem={({ item }) => (
            <DiaryCard
              item={item}
              onPress={() => {
                if (item.isDraft) { setYesterdayISO(item.date); setShowYesterdayModal(true); }
                else { navigation.navigate("EditDiary", { id: item.id }); }
              }}
              onPressImages={() => openImageViewer(item)}
            />
          )}
        />
      )}

      {/* 4. Extended FAB */}
      <TouchableOpacity 
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => navigation.navigate("EditDiary", { manual: true, date: toDateString(new Date()) })}
      >
        <Ionicons name="add" size={24} color="#FFF" />
        <Text style={styles.fabText}>เขียนบันทึก</Text>
      </TouchableOpacity>

      <YesterdayDiaryModal visible={showYesterdayModal} dateISO={yesterdayISO} onClose={(success) => { setShowYesterdayModal(false); if(success) loadData(true); }} />
      <Modal
        visible={imageViewerVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setImageViewerVisible(false)}
      >
        <View style={styles.viewerOverlay}>
          <View style={styles.viewerHeader}>
            <Text style={styles.viewerTitle} numberOfLines={1}>{imageViewerTitle}</Text>
            <TouchableOpacity onPress={() => setImageViewerVisible(false)} style={styles.viewerCloseBtn}>
              <Ionicons name="close" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>

          {imageViewerLoading ? (
            <ActivityIndicator size="large" color="#FFF" style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={imageViewerImages}
              horizontal
              pagingEnabled
              keyExtractor={(item) => item.name}
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const nextIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setImageViewerIndex(nextIndex);
              }}
              renderItem={({ item }) => (
                <ScrollView
                  maximumZoomScale={3}
                  minimumZoomScale={1}
                  centerContent
                  style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
                  contentContainerStyle={styles.viewerImageContainer}
                >
                  <Image
                    source={{ uri: `${BASE_URL}${item.url}` }}
                    style={styles.viewerImage}
                    resizeMode="contain"
                  />
                </ScrollView>
              )}
            />
          )}

          {!imageViewerLoading && imageViewerImages.length > 1 && (
            <View style={styles.viewerCounterPill}>
              <Text style={styles.viewerCounterText}>{imageViewerIndex + 1}/{imageViewerImages.length}</Text>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_COLOR },

  // --- Header ---
  header: { backgroundColor: '#FFF', paddingVertical: 12, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, shadowColor: "#000", shadowOffset: {width:0, height:4}, shadowOpacity: 0.05, shadowRadius: 10, elevation: 5, zIndex: 10 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#2D3436', marginBottom: 12 },
  monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F0F4F8', borderRadius: 16, padding: 4 },
  navBtn: { padding: 8, backgroundColor: '#FFF', borderRadius: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  monthCapsule: { flexDirection: 'row', alignItems: 'center' },
  monthText: { fontSize: 15, fontWeight: '700', color: '#2D3436' },

  // --- Reminder Banner ---
  reminderBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 20, padding: 16, backgroundColor: '#FFF', borderRadius: 20, shadowColor: THEME_COLOR, shadowOffset: {width:0, height:4}, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  reminderIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: THEME_COLOR, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  reminderTitle: { fontSize: 14, fontWeight: '700', color: '#2D3436' },
  reminderSub: { fontSize: 12, color: '#636E72', marginTop: 2 },
  reminderBtn: { backgroundColor: '#E0F7FA', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  reminderBtnText: { fontSize: 12, fontWeight: '700', color: THEME_COLOR },

  // --- Timeline Header ---
  timelineHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 12 },
  dateCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 2, marginRight: 12, borderWidth: 1, borderColor: '#F0F0F0' },
  dateCircleToday: { backgroundColor: THEME_COLOR, borderColor: THEME_COLOR },
  dateNumber: { fontSize: 20, fontWeight: '700', color: '#2D3436' },
  dateNumberToday: { color: '#FFF' },
  dateMeta: { justifyContent: 'center' },
  dateDayName: { fontSize: 16, fontWeight: '700', color: '#2D3436' },
  dateMonthYear: { fontSize: 13, color: '#636E72' },

  // --- Cards ---
  cardContainer: { backgroundColor: '#FFF', borderRadius: 18, marginBottom: 8, flexDirection: 'row', overflow: 'hidden', shadowColor: "#000", shadowOffset: {width:0, height:2}, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  cardDraft: { backgroundColor: '#F8FCFF', borderWidth: 1, borderColor: '#B3E5FC', borderStyle: 'dashed', shadowOpacity: 0 },
  accentLine: { width: 6, backgroundColor: THEME_COLOR },
  accentLineDraft: { backgroundColor: '#B3E5FC' },
  cardContent: { flex: 1, padding: 16 },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  imageQuickButton: { padding: 4, borderRadius: 8, backgroundColor: '#E0F7FA' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#2D3436', flex: 1, marginRight: 8 },
  textDraftTitle: { color: THEME_COLOR, fontStyle: 'italic' },
  cardDetail: { fontSize: 14, color: '#636E72', lineHeight: 20, marginBottom: 10 },
  
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 10 },
  starContainer: { flexDirection: 'row' },
  textNoScore: { fontSize: 12, color: '#B2BEC3', fontStyle: 'italic' },
  tagsContainer: { flexDirection: 'row', gap: 6 },
  tagBadge: { backgroundColor: '#F0F4F8', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontSize: 10, color: '#636E72', fontWeight: '600' },
  
  draftBadge: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', backgroundColor: '#B3E5FC', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  draftBadgeText: { fontSize: 11, color: '#0277BD', fontWeight: '700' },

  // --- FAB ---
  fab: { position: 'absolute', bottom: 30, right: 20, backgroundColor: THEME_COLOR, height: 56, paddingHorizontal: 24, borderRadius: 28, flexDirection: 'row', alignItems: 'center', shadowColor: THEME_COLOR, shadowOffset: {width:0, height:8}, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  fabText: { color: '#FFF', fontSize: 16, fontWeight: '700', marginLeft: 8 },

  // --- Empty ---
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#B2BEC3', marginTop: 16 },
  emptySubText: { fontSize: 14, color: '#DFE6E9', marginTop: 4 },

  // --- Image Viewer ---
  viewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  viewerHeader: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewerTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', flex: 1, marginRight: 12 },
  viewerCloseBtn: { padding: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)' },
  viewerImageContainer: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT - 100, alignItems: 'center', justifyContent: 'center' },
  viewerImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT - 140 },
  viewerCounterPill: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  viewerCounterText: { color: '#FFF', fontSize: 12, fontWeight: '600' }
});