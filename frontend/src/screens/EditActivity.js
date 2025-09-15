import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { createActivity, getActivity, updateActivity } from "../activities";

// --- ข้อมูลพื้นฐาน ---
const CATEGORIES = [
  { name: "เรียน", emoji: "📚" },
  { name: "ทำงาน", emoji: "💼" },
  { name: "ออกกำลังกาย", emoji: "🏋️" },
  { name: "เรื่องบ้าน", emoji: "🏠" },
  { name: "ส่วนตัว", emoji: "👤" },
  { name: "สุขภาพ", emoji: "❤️‍🩹" },
];

const STATUSES = [
  { key: "normal", name: "ยังไม่เริ่ม", color: "#d9d9d9" },
  { key: "warning", name: "กำลังเริ่ม", color: "#faad14" },
  { key: "success", name: "สมบูรณ์", color: "#52c41a" },
  { key: "danger", name: "หมดเวลา", color: "#ff4d4f" },
];

const WEEK_DAYS = [
  { key: "sun", label: "อา" }, { key: "mon", label: "จ" }, { key: "tue", label: "อ" },
  { key: "wed", label: "พ" }, { key: "thu", label: "พฤ" }, { key: "fri", label: "ศ" }, { key: "sat", label: "ส" },
];

function toDateStr(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}
function toTimeStr(d = new Date()) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function EditActivityScreen({ route, navigation }) {
  const id = route.params?.id || null;
  const initDate = route.params?.date || toDateStr();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].name);
  const [date, setDate] = useState(initDate);
  const [allDay, setAllDay] = useState(false);
  const [time, setTime] = useState(toTimeStr());
  const [status, setStatus] = useState("normal");
  const [notes, setNotes] = useState("");
  
  // --- งานย่อย ---
  const [subtasks, setSubtasks] = useState([]);
  const [subtaskText, setSubtaskText] = useState("");

  // --- repeat_config เก็บเป็น object ---
  const [repeatConfig, setRepeatConfig] = useState({});

  const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
  const [isStatusModalVisible, setStatusModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const d = await getActivity(id);
      setTitle(d.title);
      setCategory(d.category || CATEGORIES[0].name);
      setDate(d.date);
      setAllDay(d.all_day);
      setTime(d.time ? d.time.slice(0, 5) : toTimeStr());
      setStatus(d.status || "normal");
      setNotes(d.notes || "");
      setSubtasks(d.subtasks || []);
      setRepeatConfig(d.repeat_config || {}); // โหลด repeat_config
    } catch {
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลกิจกรรมได้");
    }
  }, [id]);

  useEffect(() => { if (id) load(); }, [id, load]);

  const onSave = async () => {
    if (!title.trim()) {
      Alert.alert("ข้อมูลไม่ครบถ้วน", "กรุณากรอกชื่อสิ่งที่ต้องทำ");
      return;
    }
    const payload = {
      date,
      all_day: allDay,
      time: allDay ? null : `${time}:00`,
      title: title.trim(),
      category,
      status,
      notes: notes.trim(),
      subtasks,
      repeat_config: repeatConfig, // ส่งเป็น object
    };
    try {
      if (id) await updateActivity(id, payload);
      else await createActivity(payload);
      navigation.goBack();
    } catch {
      Alert.alert("บันทึกไม่สำเร็จ", "กรุณาตรวจสอบข้อมูลอีกครั้ง");
    }
  };
  
  // toggle repeat_config
  const toggleRepeatDay = (dayKey) => {
    setRepeatConfig(prev => ({
      ...prev,
      [dayKey]: !prev[dayKey]
    }));
  };

  const formattedDate = useMemo(() => {
    try { return new Date(date).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" }); } catch { return date; }
  }, [date]);

  const selectedCategoryObject = useMemo(() => CATEGORIES.find((c) => c.name === category) || CATEGORIES[0], [category]);
  const selectedStatusObject = useMemo(() => STATUSES.find((s) => s.key === status) || STATUSES[0], [status]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="close" size={28} color="#555" /></TouchableOpacity>
        <Text style={styles.headerTitle}>สิ่งที่ต้องทำ</Text>
        <TouchableOpacity onPress={onSave}><Ionicons name="checkmark" size={28} color="#1f6f8b" /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.titleSection}>
          <TouchableOpacity style={styles.categoryButton} onPress={() => setCategoryModalVisible(true)}>
            <Text style={styles.categoryEmoji}>{selectedCategoryObject.emoji}</Text>
            <Text style={styles.categoryText}>{selectedCategoryObject.name}</Text>
          </TouchableOpacity>
          <TextInput style={styles.titleInput} value={title} onChangeText={setTitle} placeholder="ชื่องาน..." placeholderTextColor="#ccc" />
        </View>

        <View style={styles.section}>
          <TouchableOpacity onPress={() => setShowDatePicker(true)}><Text style={styles.dateText}>{formattedDate}</Text></TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker value={new Date(date)} mode="date" display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setDate(toDateStr(selectedDate));
                }
              }}
            />
          )}
          <View style={styles.row}><Text style={styles.label}>ทั้งวัน</Text><Switch value={allDay} onValueChange={setAllDay} trackColor={{ false: "#ccc", true: "#b3dce9" }} thumbColor={allDay ? "#1f6f8b" : "#f4f3f4"} /></View>
          {!allDay && (<View style={styles.row}><Text style={styles.label}>เวลา</Text><TouchableOpacity onPress={() => setShowTimePicker(true)}><Text style={styles.timePill}>{time}</Text></TouchableOpacity></View>)}
          {showTimePicker && (
            <DateTimePicker value={new Date()} mode="time" is24Hour={true} display="default"
              onChange={(event, selectedTime) => {
                setShowTimePicker(false);
                if (selectedTime) {
                  setTime(toTimeStr(selectedTime));
                }
              }}
            />
          )}
        </View>

        {/* Repeat */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ทำซ้ำ</Text>
          <View style={styles.weekDaySelector}>
            {WEEK_DAYS.map((day) => (
              <TouchableOpacity
                key={day.key}
                style={[styles.weekDayButton, repeatConfig[day.key] && styles.weekDayButtonSelected]}
                onPress={() => toggleRepeatDay(day.key)}
              >
                <Text style={[styles.weekDayText, repeatConfig[day.key] && styles.weekDayTextSelected]}>
                  {day.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Subtasks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>งานย่อย</Text>
          {subtasks.map(task => (
            <View key={task.id} style={styles.subtaskItem}>
              <TouchableOpacity onPress={() => setSubtasks(subtasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t))}>
                <Ionicons name={task.completed ? "checkbox" : "square-outline"} size={24} color={task.completed ? "#52c41a" : "#ccc"} />
              </TouchableOpacity>
              <Text style={[styles.subtaskText, task.completed && styles.subtaskTextCompleted]}>{task.text}</Text>
              <TouchableOpacity onPress={() => setSubtasks(subtasks.filter(t => t.id !== task.id))}>
                <Ionicons name="trash-outline" size={20} color="#ff4d4f" />
              </TouchableOpacity>
            </View>
          ))}
          <View style={styles.subtaskInputContainer}>
            <TextInput placeholder="เพิ่มงานย่อย..." style={styles.subtaskInput} value={subtaskText} onChangeText={setSubtaskText} onSubmitEditing={() => {
              if (subtaskText.trim()) {
                setSubtasks([...subtasks, { id: Date.now(), text: subtaskText.trim(), completed: false }]);
                setSubtaskText("");
              }
            }} />
            <TouchableOpacity style={styles.addSubtaskButton} onPress={() => {
              if (subtaskText.trim()) {
                setSubtasks([...subtasks, { id: Date.now(), text: subtaskText.trim(), completed: false }]);
                setSubtaskText("");
              }
            }}><Text style={styles.addSubtaskButtonText}>เพิ่ม</Text></TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 44, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#333" },
  scrollContainer: { padding: 16, paddingBottom: 100 },
  titleSection: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  categoryButton: { alignItems: "center", marginRight: 16, minWidth: 50 },
  categoryEmoji: { fontSize: 24 },
  categoryText: { fontSize: 10, color: "#777", marginTop: 2 },
  titleInput: { flex: 1, fontSize: 22, borderBottomWidth: 1, borderBottomColor: "#eee", paddingBottom: 8 },
  section: { backgroundColor: "#f9f9f9", borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12, color: "#444" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  label: { fontSize: 16, color: "#555" },
  dateText: { fontSize: 16, marginBottom: 8, fontWeight: "500" },
  timePill: { backgroundColor: "#eee", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, overflow: "hidden", color: "#555" },
  weekDaySelector: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, paddingHorizontal: 4 },
  weekDayButton: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", backgroundColor: "#e0e0e0" },
  weekDayButtonSelected: { backgroundColor: "#1f6f8b" },
  weekDayText: { color: "#555", fontWeight: "500" },
  weekDayTextSelected: { color: "#fff", fontWeight: "bold" },
  subtaskItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  subtaskText: { flex: 1, marginLeft: 10, fontSize: 16 },
  subtaskTextCompleted: { textDecorationLine: 'line-through', color: '#aaa' },
  subtaskInputContainer: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#eee', marginTop: 10 },
  subtaskInput: { flex: 1, height: 40, paddingHorizontal: 12 },
  addSubtaskButton: { backgroundColor: '#1f6f8b', justifyContent: 'center', paddingHorizontal: 16, borderTopRightRadius: 8, borderBottomRightRadius: 8 },
  addSubtaskButtonText: { color: '#fff', fontWeight: 'bold' },
});
