import React, { useEffect, useState, useCallback, useMemo } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator // --- สำหรับแสดงสถานะโหลด
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getActivity, updateActivity, deleteActivity } from "../activities"; // --- เพิ่ม deleteActivity

// --- ใช้ข้อมูลหมวดหมู่และสถานะชุดเดียวกับหน้าอื่น ---
const CATEGORIES = [
  { name: "เรียน", emoji: "🎓" }, // เปลี่ยนเป็นหมวกบัณฑิตตามภาพ
  { name: "ทำงาน", emoji: "💼" },
  { name: "ออกกำลังกาย", emoji: "🏋️" },
  { name: "เรื่องบ้าน", emoji: "🏠" },
  { name: "ส่วนตัว", emoji: "👤" },
  { name: "สุขภาพ", emoji: "❤️‍🩹" }
];
const STATUS_STYLES = {
  danger:   { name: 'หมดเวลา', barColor: '#ff4d4f' },
  warning:  { name: 'กำลังเริ่ม', barColor: '#faad14' }, // สถานะตามภาพ
  success:  { name: 'สมบูรณ์', barColor: '#52c41a' },
  normal:   { name: 'ปกติ', barColor: '#d9d9d9' },
};

export default function ActivityUpdateScreen({ route, navigation }) {
  const { id } = route.params;

  const [activity, setActivity] = useState(null);
  const [subtasks, setSubtasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false); // --- เช็คว่ามีการเปลี่ยนแปลงหรือไม่

  const showMenu = () => {
    Alert.alert(
      "ตัวเลือก",
      "คุณต้องการทำอะไรกับกิจกรรมนี้?",
      [
        { text: "ยกเลิก", style: "cancel" },
        { text: "ลบ", style: "destructive", onPress: handleDelete },
        { text: "แก้ไข", onPress: () => navigation.navigate("EditActivity", { id }) },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "ยืนยันการลบ",
      `คุณแน่ใจหรือไม่ว่าต้องการลบกิจกรรม "${activity.title}"?`,
      [
        { text: "ยกเลิก", style: "cancel" },
        { text: "ลบ", style: "destructive", onPress: async () => {
          try {
            await deleteActivity(id);
            navigation.goBack();
          } catch {
            Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถลบกิจกรรมได้");
          }
        }},
      ]
    )
  };

  // --- ตั้งค่า Header แบบไดนามิก ---
  useEffect(() => {
    navigation.setOptions({
      title: "สิ่งที่ต้องทำ", // ตั้งชื่อหัวข้อตรงนี้
      headerRight: () => (
        <TouchableOpacity onPress={showMenu} style={{ marginRight: 10 }}>
          <Ionicons name="ellipsis-vertical" size={24} color="#333" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, activity]); // เพิ่ม activity เพื่อให้ title ในเมนู delete อัปเดต

  const loadActivity = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getActivity(id);
      setActivity(data);
      // --- แก้ไข: รับข้อมูล subtasks ที่เป็น Object/Array โดยตรง ---
      setSubtasks(data.subtasks || []);
    } catch (error) {
      // --- แก้ไข: ปรับปรุงการแสดงผลข้อผิดพลาด ---
      const errorMessage = error?.message || "ไม่สามารถโหลดข้อมูลกิจกรรมได้";
      Alert.alert("เกิดข้อผิดพลาด", errorMessage);
      navigation.goBack();
    } finally {
      setLoading(false);
      setHasChanges(false); // รีเซ็ตสถานะการเปลี่ยนแปลง
    }
  }, [id, navigation]);

  // --- ใช้ listener เพื่อโหลดข้อมูลใหม่เมื่อกลับมาหน้านี้ ---
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadActivity();
    });
    return unsubscribe;
  }, [navigation, loadActivity]);

  const handleToggleSubtask = (taskId) => {
    setSubtasks(currentSubtasks =>
      currentSubtasks.map(task =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
    setHasChanges(true); // --- ตั้งค่าว่ามีการเปลี่ยนแปลงเกิดขึ้น
  };

  const onSave = async () => {
    if (!hasChanges) return;
    try {
      // --- สร้าง payload เฉพาะส่วนที่อัปเดตได้ในหน้านี้ ---
      const payload = { 
        ...activity, // ส่งข้อมูลเดิมทั้งหมดไปด้วย
        subtasks: subtasks // ส่ง subtasks ที่อัปเดตแล้ว
      };
      await updateActivity(id, payload);
      Alert.alert("สำเร็จ", "บันทึกการเปลี่ยนแปลงเรียบร้อย");
      setHasChanges(false);
    } catch {
      Alert.alert("บันทึกไม่สำเร็จ", "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };
  
  const categoryInfo = useMemo(() => {
    return CATEGORIES.find(c => c.name === activity?.category) || { name: 'ไม่มี', emoji: '📁' };
  }, [activity]);

  const statusInfo = useMemo(() => {
    return STATUS_STYLES[activity?.status] || STATUS_STYLES.normal;
  }, [activity]);

  const formattedDate = useMemo(() => {
    try {
      return new Date(activity?.date).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
    } catch { return "N/A"; }
  }, [activity]);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" /></View>;
  }
  if (!activity) {
    return <View style={styles.centered}><Text>ไม่พบข้อมูลกิจกรรม</Text></View>;
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* --- Main Info Section --- */}
        <View style={styles.mainInfoContainer}>
          <View style={styles.categoryIcon}>
            <Text style={styles.categoryEmoji}>{categoryInfo.emoji}</Text>
          </View>
          <Text style={styles.categoryText}>{activity.category || 'ไม่มีหมวดหมู่'}</Text>
        </View>
        <Text style={styles.titleText}>{activity.title}</Text>

        {/* --- Date, Time, Status Section --- */}
        <View style={styles.dateTimeContainer}>
          <Text style={styles.dateText}>วันที่ {formattedDate}</Text>
          {!activity.all_day && <Text style={styles.timeText}>ถึง {activity.time?.slice(0, 5) || 'N/A'}</Text>}
          <View style={styles.statusContainer}>
            <View style={[styles.statusBar, { backgroundColor: statusInfo.barColor }]} />
            <Text style={styles.statusText}>{statusInfo.name}</Text>
          </View>
        </View>

        {/* --- Sub-tasks Section --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>งานย่อย</Text>
          {subtasks.length > 0 ? (
            subtasks.map(task => (
              <TouchableOpacity key={task.id} style={styles.subtaskItem} onPress={() => handleToggleSubtask(task.id)}>
                <Ionicons name={task.completed ? "checkbox" : "square-outline"} size={24} color={task.completed ? "#52c41a" : "#ccc"} />
                <Text style={[styles.subtaskText, task.completed && styles.subtaskTextCompleted]}>{task.text}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptySectionText}>ไม่มีงานย่อย</Text>
          )}
        </View>

        {/* --- Details/Attachments Section --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>รายละเอียด</Text>
          {activity.notes ? (
            <Text style={styles.notesText}>{activity.notes}</Text>
          ) : (
             <Text style={styles.emptySectionText}>ไม่มีรายละเอียดเพิ่มเติม</Text>
          )}
          <View style={styles.attachmentBox}>
            <Ionicons name="image-outline" size={32} color="#ccc" style={styles.icon}/>
            <Ionicons name="text-outline" size={32} color="#ccc" style={styles.icon}/>
            <Ionicons name="chatbubble-ellipses-outline" size={32} color="#ccc" style={styles.icon}/>
            <Ionicons name="videocam-outline" size={32} color="#ccc" style={styles.icon}/>
          </View>
        </View>
      </ScrollView>

      {/* --- Save Button --- */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.saveButton, !hasChanges && styles.saveButtonDisabled]} 
          onPress={onSave}
          disabled={!hasChanges}
        >
          <Text style={styles.saveButtonText}>บันทึก</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContainer: { padding: 20, paddingBottom: 100 },
  mainInfoContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  categoryIcon: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  categoryEmoji: { fontSize: 24 },
  categoryText: { marginLeft: 12, fontSize: 14, color: '#555' },
  titleText: { fontSize: 28, fontWeight: 'bold', color: '#333', marginTop: 4, marginBottom: 20 },
  dateTimeContainer: { marginBottom: 24 },
  dateText: { fontSize: 16, color: '#333', marginBottom: 4 },
  timeText: { fontSize: 14, color: '#777', marginBottom: 12 },
  statusContainer: { flexDirection: 'row', alignItems: 'center' },
  statusBar: { width: 12, height: 12, borderRadius: 4, marginRight: 8 },
  statusText: { fontSize: 14, color: '#555', fontWeight: '500' },
  section: { backgroundColor: '#f9f9f9', borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16, color: '#444' },
  emptySectionText: { color: '#999', fontStyle: 'italic' },
  notesText: { fontSize: 14, color: '#555', lineHeight: 22, marginBottom: 16 },
  subtaskItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, },
  subtaskText: { flex: 1, marginLeft: 12, fontSize: 16 },
  subtaskTextCompleted: { textDecorationLine: 'line-through', color: '#aaa' },
  attachmentBox: { flexDirection: 'row', justifyContent: 'flex-start', backgroundColor: '#fff', borderRadius: 8, padding: 16, borderWidth: 1, borderColor: '#eee', marginTop: 10 },
  icon: { marginHorizontal: 8 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#f0f0f0', backgroundColor: '#fff' },
  saveButton: { backgroundColor: '#555', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveButtonDisabled: { backgroundColor: '#ccc' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

