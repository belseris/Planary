// screens/ActivityDetailScreen.js
import React, { useEffect, useState, useCallback } from "react";
import { 
  View, Text, ScrollView, TouchableOpacity, StyleSheet, 
  Alert, ActivityIndicator, TextInput, Platform, KeyboardAvoidingView, LayoutAnimation 
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from 'react-native-safe-area-context';
import { getActivity, deleteActivity, updateActivity } from "../api";
import { CATEGORIES, STATUSES, STATUS_OPTIONS } from "../utils/constants";
import { cancelScheduledNotification } from "../services/notificationService";

// --- Constants & Config ---
const THEME_COLOR = "#1f6f8b";
const BG_COLOR = "#F4F6F8";

export default function ActivityDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState("");

  // Load Data
  const loadActivity = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getActivity(id);
      setActivity(data);
      setNotesText(data.notes || "");
    } catch (error) {
      Alert.alert("Error", "ไม่สามารถโหลดข้อมูลได้");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [id, navigation]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadActivity);
    return unsubscribe;
  }, [navigation, loadActivity]);

  // Handle Routine Logic & Header Menu
  useEffect(() => {
    if (activity) {
      // 🎨 ปรับ Header ให้โปร่งใส เพื่อโชว์ Custom Header ของเรา
      navigation.setOptions({ 
        headerTitle: "",
        headerStyle: { backgroundColor: THEME_COLOR, shadowColor: 'transparent', elevation: 0 },
        headerTintColor: '#fff',
        headerRight: () => {
          if (activity.routine_id) return null; // Routine ห้ามลบ/แก้ที่นี่
          return (
            <TouchableOpacity onPress={showMenu} style={{ marginRight: 16 }}>
              <Ionicons name="ellipsis-horizontal-circle" size={28} color="#fff" />
            </TouchableOpacity>
          );
        },
      });
    }
  }, [navigation, activity]);

  // Actions
  const handleDelete = () => {
    Alert.alert("ยืนยันการลบ", `ลบ "${activity.title}" ใช่หรือไม่?`, [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ลบ", style: "destructive", onPress: async () => {
        try {
          // 🔴 Flow 3: ยกเลิก notification ก่อนลบ
          if (activity.notification_id) {
            await cancelScheduledNotification(activity.notification_id);
          }
          
          await deleteActivity(id);
          navigation.goBack();
        } catch { Alert.alert("ผิดพลาด", "ลบไม่ได้"); }
      }},
    ]);
  };
  
  const showMenu = () => {
    Alert.alert("จัดการกิจกรรม", "", [
        { text: "แก้ไขข้อมูล", onPress: () => navigation.navigate("EditActivity", { id }) },
        { text: "ลบกิจกรรม", style: "destructive", onPress: handleDelete },
        { text: "ยกเลิก", style: "cancel" },
    ]);
  };

  const toggleSubtask = async (subtaskId) => {
    // Animation
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    const updatedSubtasks = activity.subtasks.map(task => 
      task.id === subtaskId ? { ...task, completed: !task.completed } : task
    );
    const updatedActivity = { ...activity, subtasks: updatedSubtasks };
    
    setActivity(updatedActivity); 
    try { await updateActivity(id, updatedActivity); } catch { loadActivity(); }
  };

  const handleSaveNotes = async () => {
    try {
      await updateActivity(id, { notes: notesText });
      setActivity({ ...activity, notes: notesText });
      setEditingNotes(false);
    } catch { Alert.alert("ผิดพลาด", "บันทึกโน้ตไม่ได้"); }
  };

  const handleStatusUpdate = async (newStatus) => {
    if (!activity || activity.status === newStatus) return;
    
    // 🔴 Flow 3: ถ้าอัปเดตเป็น 'done' - ยกเลิก notification
    if (newStatus === 'done' && activity.notification_id) {
      await cancelScheduledNotification(activity.notification_id);
    }
    
    const updatedActivity = { ...activity, status: newStatus };
    setActivity(updatedActivity);
    try { await updateActivity(id, { status: newStatus }); } catch { loadActivity(); }
  };

  const showStatusMenu = () => {
    const options = STATUS_OPTIONS.map(opt => ({
        text: opt.label,
        onPress: () => handleStatusUpdate(opt.key),
    }));
    options.push({ text: "ยกเลิก", style: "cancel" });
    Alert.alert("เปลี่ยนสถานะ", "", options);
  };

  // UI Helpers
  const calculateProgress = () => {
    if (!activity?.subtasks?.length) return 0;
    const completed = activity.subtasks.filter(t => t.completed).length;
    return completed / activity.subtasks.length;
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={THEME_COLOR} /></View>;
  if (!activity) return <View style={styles.centered}><Text>ไม่พบข้อมูล</Text></View>;

  const category = CATEGORIES.find(c => c.name === activity.category) || {};
  const status = STATUSES[activity.status] || STATUSES.pending;
  const progress = calculateProgress();

  return (
    <View style={styles.container}>
      {/* 1. Header Background */}
      <View style={styles.headerBg}>
         <View style={styles.headerContent}>
             <View style={styles.iconCircle}>
                 <Text style={styles.emoji}>{category.emoji || "📝"}</Text>
             </View>
             <Text style={styles.headerTitle}>{activity.title}</Text>
         </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{flex: 1}}>
        <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 40 }}>
          
          {/* 2. Main Info Card (Floating) */}
          <View style={styles.card}>
            
            {/* Status Button */}
            <TouchableOpacity 
                style={[styles.statusButton, { backgroundColor: status.backgroundColor + '20', borderColor: status.backgroundColor }]} 
                onPress={showStatusMenu}
            >
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                </View>
                <Ionicons name="chevron-down" size={16} color={status.color} />
            </TouchableOpacity>

            {/* Grid Info */}
            <View style={styles.gridContainer}>
                <View style={styles.gridItem}>
                    <Ionicons name="calendar" size={20} color="#666" style={{marginBottom: 4}}/>
                    <Text style={styles.gridLabel}>วันที่</Text>
                    <Text style={styles.gridValue}>
                        {new Date(activity.date).toLocaleDateString("th-TH", { day: 'numeric', month: 'short', year: '2-digit' })}
                    </Text>
                </View>
                <View style={styles.separator} />
                <View style={styles.gridItem}>
                    <Ionicons name="time" size={20} color="#666" style={{marginBottom: 4}}/>
                    <Text style={styles.gridLabel}>เวลา</Text>
                    <Text style={styles.gridValue}>
                        {activity.all_day ? "ทั้งวัน" : activity.time?.slice(0,5) || "--:--"}
                    </Text>
                </View>
            </View>

            {/* Routine Warning Banner */}
            {activity.routine_id && (
                <View style={styles.routineBanner}>
                    <Ionicons name="repeat" size={16} color="#666" />
                    <Text style={styles.routineText}>สร้างจาก Routine (แก้ไขได้เฉพาะสถานะ/โน้ต)</Text>
                </View>
            )}
          </View>

          {/* 3. Subtasks Section with Progress */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>รายการงานย่อย</Text>
                {activity.subtasks?.length > 0 && (
                    <Text style={styles.progressText}>
                        {Math.round(progress * 100)}%
                    </Text>
                )}
            </View>
            
            {/* Progress Bar */}
            {activity.subtasks?.length > 0 && (
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
                </View>
            )}

            <View style={styles.taskList}>
                {activity.subtasks?.length > 0 ? (
                    activity.subtasks.map((task, index) => (
                    <TouchableOpacity 
                        key={task.id} 
                        style={[styles.taskRow, index !== activity.subtasks.length - 1 && styles.taskRowBorder]} 
                        onPress={() => toggleSubtask(task.id)}
                    >
                        <MaterialCommunityIcons 
                            name={task.completed ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"} 
                            size={24} 
                            color={task.completed ? "#4CAF50" : "#CCC"} 
                        />
                        <Text style={[styles.taskText, task.completed && styles.taskTextDone]}>
                            {task.text}
                        </Text>
                    </TouchableOpacity>
                    ))
                ) : (
                    <Text style={styles.emptyText}>- ไม่มีงานย่อย -</Text>
                )}
            </View>
          </View>

          {/* 4. Notes Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>บันทึกเพิ่มเติม</Text>
                {!editingNotes ? (
                    <TouchableOpacity onPress={() => setEditingNotes(true)}>
                        <Text style={styles.editText}>แก้ไข</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={{flexDirection: 'row', gap: 12}}>
                         <TouchableOpacity onPress={() => { setEditingNotes(false); setNotesText(activity.notes || ""); }}>
                            <Text style={[styles.editText, {color: '#999'}]}>ยกเลิก</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleSaveNotes}>
                            <Text style={styles.saveText}>บันทึก</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {editingNotes ? (
                <TextInput
                    style={styles.noteInput}
                    value={notesText}
                    onChangeText={setNotesText}
                    multiline
                    placeholder="พิมพ์บันทึกที่นี่..."
                    textAlignVertical="top"
                    autoFocus
                />
            ) : (
                <View style={styles.noteDisplay}>
                    <Text style={activity.notes ? styles.noteContent : styles.emptyText}>
                        {activity.notes || "- ไม่มีบันทึก -"}
                    </Text>
                </View>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_COLOR },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header
  headerBg: { backgroundColor: THEME_COLOR, paddingBottom: 40, paddingHorizontal: 20, paddingTop: 10, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { alignItems: 'center', marginTop: 10 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  emoji: { fontSize: 32 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  
  scrollView: { flex: 1, marginTop: -30 }, // Pull up to overlap header

  // Main Card
  card: { backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 4, marginBottom: 20 },
  
  // Status Button
  statusButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { fontSize: 16, fontWeight: 'bold' },

  // Grid Info
  gridContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gridItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  separator: { width: 1, height: 40, backgroundColor: '#eee' },
  gridLabel: { fontSize: 12, color: '#999', marginBottom: 2 },
  gridValue: { fontSize: 16, fontWeight: '600', color: '#333' },

  // Routine Banner
  routineBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F5', marginTop: 16, padding: 8, borderRadius: 8, gap: 6 },
  routineText: { fontSize: 12, color: '#666' },

  // Sections
  sectionContainer: { backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 20, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5, elevation: 2 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  
  // Progress Bar
  progressText: { fontSize: 12, fontWeight: 'bold', color: THEME_COLOR },
  progressBarBg: { height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, marginBottom: 16, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 2 },

  // Task List
  taskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  taskRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  taskText: { flex: 1, marginLeft: 12, fontSize: 15, color: '#333' },
  taskTextDone: { textDecorationLine: 'line-through', color: '#aaa' },
  
  // Notes
  editText: { fontSize: 14, color: THEME_COLOR, fontWeight: '600' },
  saveText: { fontSize: 14, color: '#4CAF50', fontWeight: 'bold' },
  noteDisplay: { minHeight: 40, justifyContent: 'center' },
  noteContent: { fontSize: 15, color: '#555', lineHeight: 22 },
  noteInput: { fontSize: 15, color: '#333', lineHeight: 22, minHeight: 100, padding: 0 },
  
  emptyText: { color: '#ccc', fontStyle: 'italic', textAlign: 'center', paddingVertical: 10 },
});