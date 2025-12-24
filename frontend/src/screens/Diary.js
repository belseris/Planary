import React, { useState, useCallback, useRef } from "react";
import { View, Text, SectionList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { listDiaries } from "../api"; 
import { toDateString } from "../utils/dateUtils"; 
import YesterdayDiaryModal from '../components/YesterdayDiaryModal'; 

const MONTHS = [ "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค." ];
const DAYS = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];

// --- Components ย่อย ---
const StarDisplay = ({ score }) => {
  if (!score) return <Text style={styles.cardNoScore}>ยังไม่ให้คะแนน</Text>;
  return (
    <View style={styles.iconRow}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons key={i} name={i <= score ? "star" : "star-outline"} size={16} color={i <= score ? "#f5c518" : "#ccc"} />
      ))}
    </View>
  );
};

function DiaryCard({ item, onPress }) {
  // เช็คว่าเป็น Draft หรือไม่ เพื่อเปลี่ยนสีการ์ดให้ดูแตกต่าง
  const isDraft = item.isDraft;
  
  return (
    <TouchableOpacity 
      style={[styles.card, isDraft && styles.draftCard]} 
      onPress={onPress}
    >
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, isDraft && styles.draftText]} numberOfLines={1}>
          {item.title || "(ไม่มีชื่อเรื่อง)"}
        </Text>
        {isDraft && (
          <View style={styles.draftBadge}><Text style={styles.draftBadgeText}>รอให้คะแนน</Text></View>
        )}
        <Text style={styles.cardNotes} numberOfLines={2}>
          {item.detail || "..."}
        </Text>
        
        {!isDraft && (
          <>
            <StarDisplay score={item.mood_score} />
            {item.mood_tags && item.mood_tags.length > 0 && (
              <View style={styles.cardTagsRow}>
                {item.mood_tags.map((tag, idx) => (
                  <View key={idx} style={styles.cardTag}><Text style={styles.cardTagEmoji}>{tag}</Text></View>
                ))}
              </View>
            )}
          </>
        )}
      </View>
      {/* ไอคอนต่างกันระหว่าง Draft กับ Edit */}
      <View style={styles.cardAside}>
        <Ionicons name={isDraft ? "add-circle-outline" : "pencil"} size={24} color={isDraft ? "#1f6f8b" : "#333"} />
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

  // States สำหรับ Modal เมื่อวาน
  const [showYesterdayModal, setShowYesterdayModal] = useState(false);
  const [yesterdayISO, setYesterdayISO] = useState('');
  const hasCheckedYesterday = useRef(false);
  const [pendingCount, setPendingCount] = useState(0);

  // ✅ LOGIC ใหม่: สร้าง Draft ย้อนหลัง 4 วัน (ถ้าขาดหายไป)
  const checkAndCreateDrafts = (diaries) => {
    const missingDays = [];
    const checkLimit = 4; // เช็คย้อนหลังสูงสุด 4 วัน

    for (let i = 1; i <= checkLimit; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = toDateString(d);
      
      // ดูว่าวันนี้มีบันทึกหรือยัง
      const exists = diaries.some(diary => diary.date === dateStr);

      if (!exists) {
        missingDays.push({
          id: `draft-${dateStr}`,
          date: dateStr,
          title: `(ยังไม่ได้บันทึก) ของวันที่ ${dateStr}`, // ชื่อชั่วคราว
          detail: "แตะเพื่อเขียนบันทึกย้อนหลัง...",
          mood_score: 0,
          isDraft: true, // Flag บอกว่าเป็นร่าง
        });
      }
    }
    // เอา Drafts ไว้บนสุด แล้วตามด้วยของจริง
    return [...missingDays, ...diaries];
  };

  const loadData = useCallback(async (forceCheck = false) => {
    setLoading(true);
    try {
      const startDate = new Date(year, selectedMonth, 1).toISOString().slice(0, 10);
      const endDate = new Date(year, selectedMonth + 1, 0).toISOString().slice(0, 10);
      let diaries = await listDiaries({ startDate, endDate });

      // ตรวจสอบ Logic เฉพาะเดือนปัจจุบัน
      if (year === today.getFullYear() && selectedMonth === today.getMonth()) {
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        const yStr = toDateString(yesterday);
        
        const hasYesterday = diaries.some(d => d.date === yStr);

        // 1. ถ้าขาด "เมื่อวาน" -> เปิด Modal ถามก่อนเลย (Priority สูงสุด)
        if (!hasYesterday && (!hasCheckedYesterday.current || forceCheck)) {
            setYesterdayISO(yStr);
            setShowYesterdayModal(true);
            hasCheckedYesterday.current = true; 
        }

        // 2. ถ้าขาดวันอื่นๆ (รวมถึงเมื่อวานถ้าปิด Modal ไปแล้ว) -> สร้างการ์ด Draft รอไว้
        diaries = checkAndCreateDrafts(diaries);
        setPendingCount(diaries.filter(d => d.isDraft).length);
      }
      
      const groupedData = diaries.reduce((acc, diary) => {
        const dateKey = diary.date;
        if (!acc[dateKey]) acc[dateKey] = { title: dateKey, data: [] };
        acc[dateKey].data.push(diary);
        return acc;
      }, {});
      
      // เรียงวันที่จากใหม่ไปเก่า
      const sortedSections = Object.values(groupedData).sort((a, b) => new Date(b.title) - new Date(a.title));
      setSections(sortedSections);

    } catch (err) {
      console.error("Failed to load diaries:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, year]);

  useFocusEffect(useCallback(() => { 
      loadData(); 
  }, [loadData]));

  const handleModalClose = (success) => {
      setShowYesterdayModal(false);
      if (success) {
          loadData(true); // โหลดใหม่ถ้าบันทึกสำเร็จ
      }
  };

  const handleCardPress = (item) => {
    if (item.isDraft) {
        // ถ้าเป็น Draft ให้เปิด Modal สำหรับให้คะแนนแบบเร็ว (ทุกวัน)
        setYesterdayISO(item.date);
        setShowYesterdayModal(true);
    } else {
        navigation.navigate("EditDiary", { id: item.id });
    }
  };

  const formatSectionHeaderDate = (dateString) => {
    try {
      const d = new Date(dateString);
      const day = d.getDate();
      const month = MONTHS[d.getMonth()];
      const year = d.getFullYear() + 543;
      const dayName = DAYS[d.getDay()];
      return `${day} ${month} ${year} • ${dayName}`;
    } catch { return dateString; }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Month Bar */}
      <View style={styles.monthBar}>
         <TouchableOpacity onPress={() => {/* Logic เปลี่ยนเดือน */}}><Text style={styles.monthText}>{MONTHS[selectedMonth]} {year+543}</Text></TouchableOpacity>
      </View>

      {/* Pending Review Banner */}
      {pendingCount > 0 && (
        <View style={styles.pendingBanner}>
          <Ionicons name="alert-circle" size={18} color="#1f6f8b" style={{ marginRight: 6 }} />
          <Text style={styles.pendingBannerText}>มี {pendingCount} วันรอให้คะแนน</Text>
          <TouchableOpacity style={styles.pendingAction} onPress={() => {
            // หาวันแรกที่เป็น draft และเปิด modal
            const firstDraft = sections.flatMap(sec => sec.data).find(d => d.isDraft);
            if (firstDraft) {
              setYesterdayISO(firstDraft.date);
              setShowYesterdayModal(true);
            }
          }}>
            <Text style={styles.pendingActionText}>ให้คะแนนเลย</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? <ActivityIndicator size="large" style={{ marginTop: 50 }} /> : sections.length === 0 ? (
        <View style={styles.emptyContainer}><Text style={styles.emptyText}>ไม่มีบันทึกในเดือนนี้</Text></View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id.toString()}
          renderSectionHeader={({ section: { title } }) => <View style={styles.sectionHeader}><Text style={styles.sectionHeaderText}>{formatSectionHeaderDate(title)}</Text></View>}
          renderItem={({ item }) => <DiaryCard item={item} onPress={() => handleCardPress(item)}/>} 
        />
      )}

      {/* FAB: ปุ่มบวกสำหรับ "วันนี้" */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("EditDiary", { manual: true, date: toDateString(new Date()) })}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      <YesterdayDiaryModal 
        visible={showYesterdayModal} 
        dateISO={yesterdayISO} 
        onClose={handleModalClose} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F7F7" },
  monthBar: { flexDirection: "row", justifyContent: "center", paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderColor: '#eee' },
  monthText: { fontSize: 18, fontWeight: "bold" },
  sectionHeader: { backgroundColor: "#F7F7F7", paddingHorizontal: 16, paddingVertical: 10, paddingTop: 16 },
  sectionHeaderText: { fontWeight: "600", color: '#333', fontSize: 15 },
  
  // Card Styles
  card: { backgroundColor: "#FFFFFF", marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 12, flexDirection: "row", elevation: 2 },
  draftCard: { backgroundColor: "#f0f8ff", borderStyle: 'dashed', borderWidth: 1, borderColor: '#1f6f8b' }, // สไตล์สำหรับ Draft
  draftBadge: { alignSelf:'flex-start', backgroundColor:'#e8f4f8', borderColor:'#1f6f8b', borderWidth:1, paddingHorizontal:8, paddingVertical:2, borderRadius:10, marginBottom:6 },
  draftBadgeText: { fontSize:11, color:'#1f6f8b', fontWeight:'600' },
  
  cardContent: { flex: 1 },
  cardAside: { alignItems: "center", justifyContent: 'center', marginLeft: 16 },
  cardTitle: { fontSize: 17, fontWeight: "600", marginBottom: 4, color: '#111' },
  draftText: { color: '#1f6f8b', fontStyle: 'italic' },
  
  cardNotes: { fontSize: 14, color: "#777", marginBottom: 8 },
  cardTagsRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 8, gap: 6 },
  cardTag: { backgroundColor: "#f0f3f7", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  cardTagEmoji: { fontSize: 12, color: '#555' },
  iconRow: { flexDirection: "row", gap: 2 },
  cardNoScore: { fontSize: 12, color: '#aaa', fontStyle: 'italic' },
  
  fab: { position: "absolute", right: 20, bottom: 20, backgroundColor: "#1f6f8b", width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", elevation: 5 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#888' },
  pendingBanner: { flexDirection:'row', alignItems:'center', margin:16, marginTop:8, backgroundColor:'#f3f8fb', borderColor:'#d9e8ef', borderWidth:1, borderRadius:12, paddingVertical:10, paddingHorizontal:12 },
  pendingBannerText: { color:'#1f6f8b', fontSize:13, fontWeight:'600', flex:1 },
  pendingAction: { paddingHorizontal:10, paddingVertical:6, backgroundColor:'#1f6f8b', borderRadius:8 },
  pendingActionText: { color:'#fff', fontSize:12, fontWeight:'700' }
});