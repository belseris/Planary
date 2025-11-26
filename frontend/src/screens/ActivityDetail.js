// screens/ActivityDetailScreen.js
import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getActivity, deleteActivity, updateActivity } from "../api";
import { CATEGORIES, STATUSES, STATUS_OPTIONS } from "../utils/constants"; // ✅ 1. Import จาก constants

export default function ActivityDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState("");

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
  
  // ✅ 2. Logic สำคัญ: ตรวจสอบ routine_id
  useEffect(() => {
    if (activity) {
      // ถ้าเป็นกิจกรรมที่สร้างจาก Routine จะ "แก้ไข" หรือ "ลบ" จากหน้านี้ไม่ได้
      // ต้องไปแก้ "แม่แบบ" ที่หน้า Profile
      if (activity.routine_id) {
        navigation.setOptions({ headerRight: null });
      } else {
        // ถ้าเป็นกิจกรรมปกติ ให้แสดงเมนู
        navigation.setOptions({
          headerRight: () => (
            <TouchableOpacity onPress={showMenu} style={{ marginRight: 16 }}>
              <Ionicons name="ellipsis-vertical" size={24} color="#333" />
            </TouchableOpacity>
          ),
        });
      }
    }
  }, [navigation, activity]);

  const handleDelete = () => {
    Alert.alert("ยืนยันการลบ", `คุณแน่ใจหรือไม่ว่าต้องการลบ "${activity.title}"?`, [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ลบ", style: "destructive", onPress: async () => {
        try {
          await deleteActivity(id);
          navigation.goBack();
        } catch { Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถลบกิจกรรมได้"); }
      }},
    ]);
  };
  
  const showMenu = () => {
    Alert.alert("ตัวเลือก", "เลือกการกระทำ", [
        { text: "ยกเลิก", style: "cancel" },
        { text: "แก้ไข", onPress: () => navigation.navigate("EditActivity", { id }) },
        { text: "ลบกิจกรรม", style: "destructive", onPress: handleDelete },
    ]);
  };

  const toggleSubtask = async (subtaskId) => {
    const originalActivity = { ...activity }; 
    const updatedSubtasks = activity.subtasks.map(task => 
      task.id === subtaskId ? { ...task, completed: !task.completed } : task
    );
    const updatedActivity = { ...activity, subtasks: updatedSubtasks };
    
    setActivity(updatedActivity); 
    try {
      await updateActivity(id, updatedActivity);
    } catch {
      Alert.alert("Error", "ไม่สามารถอัปเดตงานย่อยได้");
      setActivity(originalActivity); 
    }
  };

  const handleSaveNotes = async () => {
    try {
      await updateActivity(id, { notes: notesText });
      setActivity({ ...activity, notes: notesText });
      setEditingNotes(false);
      Alert.alert("สำเร็จ", "บันทึกรายละเอียดแล้ว");
    } catch (error) {
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกรายละเอียดได้");
    }
  };

  // ✅ 3. อัปเดตสถานะ (ทำได้เสมอ ไม่ว่าจะเป็น Routine หรือไม่)
  const handleStatusUpdate = async (newStatus) => {
    if (!activity || activity.status === newStatus) return;
    const originalActivity = { ...activity }; 
    const updatedActivity = { ...activity, status: newStatus };
    setActivity(updatedActivity);
    try {
      // ส่งแค่ status ที่เปลี่ยนไป
      await updateActivity(id, { status: newStatus }); 
    } catch (error) {
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถอัปเดตสถานะได้");
      setActivity(originalActivity);
    }
  };

  const showStatusMenu = () => {
    const options = STATUS_OPTIONS.map(opt => ({
        text: opt.label,
        onPress: () => handleStatusUpdate(opt.key),
    }));
    options.push({ text: "ยกเลิก", style: "cancel" });
    Alert.alert("เปลี่ยนสถานะ", "เลือกสถานะใหม่สำหรับกิจกรรมนี้", options);
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" /></View>;
  if (!activity) return <View style={styles.centered}><Text>ไม่พบข้อมูล</Text></View>;

  const category = CATEGORIES.find(c => c.name === activity.category) || {};
  const status = STATUSES[activity.status] || STATUSES.normal;

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.emoji}>{category.emoji || "📁"}</Text>
        <Text style={styles.title}>{activity.title}</Text>
      </View>

      <View style={styles.infoBox}>
        <View style={styles.infoRow}><Ionicons name="calendar-outline" size={20} color="#555"/><Text style={styles.infoText}>{new Date(activity.date).toLocaleDateString("th-TH", { dateStyle: 'full' })}</Text></View>
        {!activity.all_day && <View style={styles.infoRow}><Ionicons name="time-outline" size={20} color="#555"/><Text style={styles.infoText}>{activity.time?.slice(0,5)}</Text></View>}
        
        {/* ✅ 4. ส่วนเปลี่ยนสถานะ กดได้เสมอ */}
        <TouchableOpacity style={styles.infoRowTouchable} onPress={showStatusMenu}>
            <View style={[styles.statusBadge, { backgroundColor: status.backgroundColor }]}>
              <Text style={{ color: status.color, fontWeight: 'bold' }}>{status.label}</Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#555" style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
      </View>

      {/* Subtasks */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>งานย่อย</Text>
        {activity.subtasks?.length > 0 ? (
          activity.subtasks.map(task => (
            <TouchableOpacity key={task.id} style={styles.subtaskItem} onPress={() => toggleSubtask(task.id)}>
              <Ionicons name={task.completed ? "checkbox" : "square-outline"} size={24} color={task.completed ? "#52c41a" : "#ccc"} />
              <Text style={[styles.subtaskText, task.completed && styles.subtaskTextCompleted]}>{task.text}</Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>ไม่มีงานย่อย</Text>
        )}
      </View>
      
      {/* Notes */}
      <View style={styles.section}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={styles.sectionTitle}>รายละเอียด</Text>
          {!editingNotes ? (
            <TouchableOpacity onPress={() => setEditingNotes(true)}>
              <Ionicons name="create-outline" size={24} color="#1f6f8b" />
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => { setEditingNotes(false); setNotesText(activity.notes || ""); }}>
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveNotes}>
                <Ionicons name="checkmark" size={24} color="#52c41a" />
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {editingNotes ? (
          <TextInput
            style={styles.notesInput}
            value={notesText}
            onChangeText={setNotesText}
            placeholder="เขียนรายละเอียดเพิ่มเติม..."
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        ) : (
          <Text style={activity.notes ? styles.notesText : styles.emptyText}>
            {activity.notes || "ไม่มีรายละเอียดเพิ่มเติม"}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  screen: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 10 },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  infoBox: { margin: 20, padding: 16, backgroundColor: '#f9f9f9', borderRadius: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  infoRowTouchable: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, marginTop: 8, borderTopWidth: 1, borderTopColor: '#eee' },
  infoText: { fontSize: 16, marginLeft: 12, color: '#333' },
  section: { marginHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, color: '#444' },
  emptyText: { color: '#999', fontStyle: 'italic' },
  subtaskItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: '#f9f9f9', padding: 12, borderRadius: 8 },
  subtaskText: { flex: 1, marginLeft: 12, fontSize: 16 },
  subtaskTextCompleted: { textDecorationLine: 'line-through', color: '#aaa' },
  notesText: { fontSize: 16, color: '#555', lineHeight: 24, backgroundColor: '#f9f9f9', padding: 16, borderRadius: 8 },
  notesInput: { fontSize: 16, color: '#333', lineHeight: 24, backgroundColor: '#fff', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#1f6f8b', minHeight: 120 },
});