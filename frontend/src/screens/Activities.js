/**
 * ActivitiesScreen.js - Activities List with Profile-style UI
 * 
 * ✨ Features:
 * 1. 📅 Week Selector: Day chips (จ-ศ) at top
 * 2. 🎬 Card-based Layout: Similar to Profile routine cards
 * 3. 📊 Shows Status & Subtasks: Display real-time progress
 * 4. 🔄 Swipe Actions: Left = done, Right = delete
 */

import React, { useEffect, useState, useCallback } from "react";
import { 
  View, Text, SectionList, TouchableOpacity, StyleSheet, 
  ActivityIndicator, RefreshControl, Alert, ScrollView
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { listActivities, updateActivity, deleteActivity } from "../api";
import { toDateString } from "../utils/dateUtils";
import { CATEGORIES, TH_DAYS } from "../utils/constants";
import MonthlyCalendar from "../components/MonthlyCalendar";
import { cancelScheduledNotification, scheduleActivityNotification } from "../services/notificationService";

// --- Constants ---
const THEME_COLOR = "#1f6f8b";
const STATUS_COLORS = {
  pending: "#FF3B30",       // 🔴 Red
  in_progress: "#FFCC00",   // 🟡 Yellow
  done: "#34C759"           // 🟢 Green
};

const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

// --- Utility ---
const getCategoryEmoji = (category) => {
  const emojiMap = {
    "เรียน": "📚",
    "ทำงาน": "💼",
    "ออกกำลังกาย": "🏋️",
    "เรื่องบ้าน": "🏠",
    "ส่วนตัว": "👤",
    "สุขภาพ": "🏥",
    "สังคม": "👥",
    "งานอดิเรก": "🎨",
    "อื่นๆ": "📌",
    "study": "📚",
    "work": "💼",
    "health": "🏥",
    "personal": "👤",
    "social": "👥",
    "hobby": "🎨",
    "other": "📌"
  };
  return emojiMap[category] || "📌";
};

const getWeek = (selectedDate) => {
  const current = new Date(selectedDate);
  const startOfWeek = new Date(current);
  startOfWeek.setDate(current.getDate() - current.getDay());

  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return { date: toDateString(d), dayIndex: d.getDay() };
  });
};

// --- Components ---

/**
 * 📅 WeekSelector: Day chips like Profile
 */
const WeekSelector = ({ week, selectedDate, onSelectDate }) => {
  return (
    <View style={styles.weekContainer}>
      {week.map(({ date, dayIndex }) => {
        const isSelected = date === selectedDate;
        return (
          <TouchableOpacity
            key={date}
            style={[styles.dayChip, isSelected && styles.dayChipSelected]}
            onPress={() => onSelectDate(date)}
          >
            <Text style={[styles.dayChipText, isSelected && styles.dayChipTextSelected]}>
              {TH_DAYS[dayIndex]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

/**
 * 🎬 ActivityCard: Card-based layout with status & subtasks
 */
const ActivityCard = ({ item, onPress, onRefresh }) => {
  const isDone = item.status === "done";
  const isInProgress = item.status === "in_progress";
  const emoji = getCategoryEmoji(item.category);
  
  // Status
  const statusBg = isDone ? STATUS_COLORS.done : 
                   (isInProgress ? STATUS_COLORS.in_progress : STATUS_COLORS.pending);
  const statusText = isDone ? "เสร็จ" : (isInProgress ? "กำลังทำ" : "ยังไม่เริ่ม");
  const statusTextColor = isInProgress ? "#333" : "#fff";

  // Subtasks
  const subtaskCount = item.subtasks ? item.subtasks.length : 0;
  const subtaskDone = item.subtasks ? item.subtasks.filter(s => s.is_done).length : 0;
  const hasSubtasks = subtaskCount > 0;

  const timeLabel = item.time ? item.time.slice(0, 5) : "--:--";

  // Update status
  const handleUpdateStatus = async (newStatus) => {
    try {
      // 🔴 Flow 3: ถ้าอัปเดตเป็น 'done' - ยกเลิก notification
      if (newStatus === 'done' && item.notification_id) {
        await cancelScheduledNotification(item.notification_id);
      }
      
      await updateActivity(item.id, { status: newStatus });
      onRefresh?.();
    } catch (err) {
      console.error('Update status error:', err);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถอัพเดตสถานะได้");
    }
  };

  // Delete activity
  const handleDelete = async () => {
    Alert.alert("ลบกิจกรรม", "ต้องการลบหรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        onPress: async () => {
          try {
            // 🔴 Flow 3: ยกเลิก notification ก่อนลบ
            if (item.notification_id) {
              await cancelScheduledNotification(item.notification_id);
            }
            
            await deleteActivity(item.id);
            onRefresh?.();
          } catch (err) {
            console.error('Delete error:', err);
            Alert.alert("ข้อผิดพลาด", "ไม่สามารถลบกิจกรรมได้");
          }
        },
        style: "destructive"
      }
    ]);
  };

  // Swipe actions
  const renderLeftActions = () => (
    <View style={styles.swipeAction}>
      <Ionicons name="checkmark" size={20} color="#fff" />
    </View>
  );

  const renderRightActions = () => (
    <View style={[styles.swipeAction, { backgroundColor: '#E57373' }]}>
      <Ionicons name="trash" size={20} color="#fff" />
    </View>
  );

  return (
    <Swipeable 
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      onSwipeableLeftOpen={() => handleUpdateStatus('done')}
      onSwipeableRightOpen={() => handleDelete()}
      leftThreshold={100}
      rightThreshold={100}
    >
      <TouchableOpacity 
        style={[styles.card, isDone && styles.cardDone]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {/* Left: Icon */}
        <View style={[styles.iconBox, { backgroundColor: '#f0f4f8' }]}>
          <Text style={styles.cardEmoji}>{emoji}</Text>
        </View>

        {/* Middle: Title & Subtasks */}
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, isDone && styles.textStrike]} numberOfLines={1}>
            {item.title}
          </Text>
          {hasSubtasks && (
            <Text style={styles.subtaskBadge}>
              งานย่อย {subtaskDone}/{subtaskCount}
            </Text>
          )}
        </View>

        {/* Time Badge */}
        <View style={styles.timeBadge}>
          <Ionicons name="time-outline" size={12} color="#666" style={{ marginRight: 4 }} />
          <Text style={styles.cardTime}>{timeLabel}</Text>
        </View>

        {/* Status Badge - Clickable */}
        <TouchableOpacity
          style={[styles.statusBadge, { backgroundColor: statusBg }]}
          onPress={() => {
            const next = isDone ? 'pending' : (isInProgress ? 'done' : 'in_progress');
            handleUpdateStatus(next);
          }}
        >
          <Text style={[styles.statusBadgeText, { color: statusTextColor }]}>
            {statusText}
          </Text>
        </TouchableOpacity>

        {/* Menu Button */}
        <TouchableOpacity style={styles.menuBtn} onPress={onPress}>
          <Ionicons name="chevron-forward" size={16} color="#ccc" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Swipeable>
  );
};

// --- Main Screen ---

export default function ActivitiesScreen({ navigation }) {
  const [selectedDate, setSelectedDate] = useState(toDateString(new Date()));
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [calendarExpanded, setCalendarExpanded] = useState(false);

  const week = getWeek(selectedDate);

  const scheduleMissingNotifications = useCallback(async (items) => {
    const now = new Date();
    const toSchedule = (items || []).filter(item => (
      item &&
      item.remind &&
      !item.notification_id &&
      !item.all_day &&
      item.time &&
      item.date &&
      item.status !== 'done' &&
      item.status !== 'cancelled'
    ));

    for (const item of toSchedule) {
      try {
        const [year, month, day] = String(item.date).split('-').map(Number);
        const timeStr = String(item.time).slice(0, 5);
        const [hours, minutes] = timeStr.split(':').map(Number);
        if (!year || !month || !day || Number.isNaN(hours) || Number.isNaN(minutes)) continue;

        const activityDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
        const offsetMin = Number(item.remind_offset_min || 0);
        const triggerDate = new Date(activityDateTime.getTime() - (offsetMin * 60 * 1000));

        if (triggerDate <= now) continue;

        const notificationId = await scheduleActivityNotification({
          title: item.title,
          activityId: item.id,
          triggerDate,
          remindSound: item.remind_sound !== false,
        });

        if (notificationId) {
          await updateActivity(item.id, { notification_id: notificationId });
        }
      } catch (err) {
        console.warn('Schedule routine notification error:', err);
      }
    }
  }, []);

  const fetchActivities = useCallback(async (dateStr) => {
    setLoading(true);
    try {
      const data = await listActivities({ qdate: dateStr });
      const items = data.items || [];
      setActivities(items);
      scheduleMissingNotifications(items);
    } catch (err) {
      console.error(err);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถโหลดกิจกรรมได้");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchActivities(selectedDate);
  }, [fetchActivities, selectedDate]));

  const dateObj = new Date(selectedDate);
  const dailyActivities = activities.filter(item => !!item.routine_id);
  const otherActivities = activities.filter(item => !item.routine_id);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        
        {/* Header */}
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.headerTitle}>ตารางงาน</Text>
            <Text style={styles.headerDate}>
              {dateObj.getDate()} {TH_MONTHS[dateObj.getMonth()]} {dateObj.getFullYear()+543}
            </Text>
          </View>
          <TouchableOpacity style={styles.monthBtn} onPress={() => setCalendarExpanded(!calendarExpanded)}>
            <Ionicons name={calendarExpanded ? "calendar" : "calendar-outline"} size={16} color={THEME_COLOR} />
            <Text style={styles.monthBtnText}>{calendarExpanded ? "ปิด" : "รายเดือน"}</Text>
          </TouchableOpacity>
        </View>

        {/* Monthly Calendar */}
        {calendarExpanded && (
          <View style={styles.calendarSection}>
            <MonthlyCalendar
              selectedDate={selectedDate}
              onDateSelect={(date) => {
                setSelectedDate(date);
                setCalendarExpanded(false);
              }}
              onMonthChange={(newDate) => setSelectedDate(toDateString(newDate))}
            />
          </View>
        )}

        {/* Week Selector */}
        {!calendarExpanded && (
          <View style={styles.plannerContent}>
            <WeekSelector week={week} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
          </View>
        )}

        {/* List */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={THEME_COLOR} />
          </View>
        ) : (
          <ScrollView 
            style={styles.listArea}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={() => {
                  setRefreshing(true);
                  fetchActivities(selectedDate);
                }}
              />
            }
          >
            {activities.length > 0 ? (
              <>
                {dailyActivities.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>กิจกรรมประจำวัน</Text>
                    {dailyActivities.map(item => (
                      <ActivityCard
                        key={item.id}
                        item={item}
                        onPress={() => navigation.navigate("ActivityDetail", { id: item.id })}
                        onRefresh={() => fetchActivities(selectedDate)}
                      />
                    ))}
                  </>
                )}

                {otherActivities.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>กิจกรรมอื่นๆ</Text>
                    {otherActivities.map(item => (
                      <ActivityCard
                        key={item.id}
                        item={item}
                        onPress={() => navigation.navigate("ActivityDetail", { id: item.id })}
                        onRefresh={() => fetchActivities(selectedDate)}
                      />
                    ))}
                  </>
                )}
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-clear-outline" size={48} color="#ddd" />
                <Text style={styles.emptyText}>ไม่มีงาน{"\n"}วันนี้ว่าง!</Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* FAB */}
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => navigation.navigate("EditActivity", { preSelectedDate: selectedDate })}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>

      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f9fc" },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header
  headerBar: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#fff'
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: '#1A202C' },
  headerDate: { fontSize: 13, color: '#718096', marginTop: 2 },
  monthBtn: { 
    flexDirection: 'row', backgroundColor: '#f0f4f8', paddingVertical: 6, paddingHorizontal: 12, 
    borderRadius: 20, alignItems: 'center' 
  },
  monthBtnText: { marginLeft: 4, color: THEME_COLOR, fontSize: 11, fontWeight: 'bold' },

  // Week Selector
  plannerContent: { paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#fff' },
  weekContainer: { flexDirection: "row", justifyContent: 'space-between' },
  dayChip: { 
    flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: "#f8f9fa", 
    alignItems: "center", marginHorizontal: 3, borderWidth: 1, borderColor: '#E2E8F0' 
  },
  dayChipSelected: { backgroundColor: THEME_COLOR, borderColor: THEME_COLOR, shadowColor: THEME_COLOR, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  dayChipText: { fontSize: 12, fontWeight: "600", color: '#A0AEC0' },
  dayChipTextSelected: { color: '#fff', fontWeight: 'bold' },

  // List Area
  listArea: { flex: 1, backgroundColor: "#f7f9fc" },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#718096',
    marginTop: 8,
    marginBottom: 8,
  },

  // Card Layout
  card: { 
    backgroundColor: "#fff", borderRadius: 16, padding: 12, marginBottom: 10, 
    flexDirection: 'row', alignItems: 'center',
    shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 
  },
  cardDone: { opacity: 0.6 },
  textStrike: { textDecorationLine: 'line-through', color: '#999' },
  
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardEmoji: { fontSize: 20 },
  
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: "#2D3748", marginBottom: 2 },
  subtaskBadge: { fontSize: 11, color: "#718096", fontWeight: '500' },

  timeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f7fafc', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 6 },
  cardTime: { fontSize: 12, fontWeight: '600', color: "#4A5568" },

  // Status Badge
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginRight: 6,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },

  // Menu Button
  menuBtn: { padding: 6 },

  // Swipe Actions
  swipeAction: {
    backgroundColor: "#34C759",
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    borderRadius: 12,
    marginVertical: 10,
    marginHorizontal: 16,
  },

  // Empty State
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { textAlign: "center", marginTop: 12, color: "#A0AEC0", fontSize: 14, lineHeight: 20 },

  // FAB
  fab: { 
    position: "absolute", bottom: 20, right: 20, width: 56, height: 56, 
    borderRadius: 28, backgroundColor: THEME_COLOR, 
    justifyContent: "center", alignItems: "center", 
    shadowColor: THEME_COLOR, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 
  },

  // Calendar Section
  calendarSection: { 
    backgroundColor: '#fff', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#e0e0e0' 
  },
});