// screens/EditActivityScreen.js
import React, { useEffect, useMemo, useState } from "react";
import { 
  View, Text, ScrollView, TextInput, Switch, TouchableOpacity, StyleSheet, 
  Alert, Platform, KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback, ActivityIndicator, Modal, Pressable
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import TimePicker from "../components/TimePicker";
import { createActivity, getActivity, updateActivity } from "../api";
import { CATEGORIES, REMINDER_OPTIONS } from "../utils/constants";
import { toDateString, toTimeString } from "../utils/dateUtils";
import { scheduleActivityNotification, cancelScheduledNotification } from "../services/notificationService";

// Constants for Styling
const THEME_COLOR = "#1f6f8b";
const BG_COLOR = "#F2F2F7";

export default function EditActivityScreen({ route, navigation }) {
  const id = route.params?.id;
  const initialDate = route.params?.preSelectedDate || toDateString();

  const [form, setForm] = useState({
    title: "",
    category: CATEGORIES[0].name,
    date: initialDate,
    all_day: false,
    time: toTimeString(),
    status: "pending",
    notes: "",
    subtasks: [],
    remind: false,
    remind_offset_min: 15,
    remind_sound: true,
    remind_type: "simple",
  });

  const [isTitleTouched, setIsTitleTouched] = useState(false);
  const [subtaskText, setSubtaskText] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showReminderMenu, setShowReminderMenu] = useState(false);
  const [showCustomReminderInput, setShowCustomReminderInput] = useState(false);
  const [customReminderInput, setCustomReminderInput] = useState("");
  const [loading, setLoading] = useState(false);

  const isEditMode = useMemo(() => !!id, [id]);
  const isValidTitle = form.title.trim().length > 0;

  useEffect(() => {
    navigation.setOptions({ 
        title: isEditMode ? "แก้ไขกิจกรรม" : "สร้างกิจกรรมใหม่",
        headerStyle: { backgroundColor: BG_COLOR, shadowOpacity: 0, elevation: 0 },
        headerTintColor: '#000',
        headerTitleStyle: { fontWeight: 'bold' }
    });
    
    if (isEditMode) {
      const loadData = async () => {
        try {
          setLoading(true);
          const data = await getActivity(id);
          setForm({
            title: data.title || "",
            category: data.category || CATEGORIES[0].name,
            date: data.date || toDateString(),
            all_day: data.all_day || false,
            time: data.time ? data.time.slice(0, 5) : toTimeString(),
            status: data.status || "pending",
            notes: data.notes || "",
            subtasks: data.subtasks || [],
            remind: data.remind || false,
            remind_offset_min: data.remind_offset_min ?? 15,
            remind_sound: data.remind_sound !== undefined ? data.remind_sound : true,
            remind_type: data.remind_type || "simple",
          });
        } catch (error) { 
          Alert.alert("Error", "ไม่สามารถโหลดข้อมูลได้"); 
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }
  }, [id, navigation, isEditMode]);

  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsTitleTouched(true);
    if (!isValidTitle) {
      Alert.alert("ข้อมูลไม่ครบ", "กรุณากรอกชื่อกิจกรรม");
      return;
    }

    setLoading(true);
    let newNotificationId = null;

    try {
      // 🟢 Phase 1: จัดการ Notification (Schedule/Cancel)
      if (form.remind && !form.all_day && form.time) {
        // คำนวณเวลาที่ต้องแจ้งเตือนจริง (activity time - offset)
        const [hours, minutes] = form.time.split(':').map(Number);
        const [year, month, day] = (form.date || '').split('-').map(Number);
        const activityDateTime = new Date(year, (month || 1) - 1, day || 1, hours, minutes, 0, 0);
        
        const triggerDate = new Date(activityDateTime.getTime() - (form.remind_offset_min * 60 * 1000));

        // ตรวจสอบว่าเวลา trigger เป็นอนาคตหรือไม่
        if (triggerDate > new Date()) {
          // ถ้าเป็นโหมดแก้ไข: ยกเลิก notification เดิมก่อน
          if (isEditMode && form.notification_id) {
            await cancelScheduledNotification(form.notification_id);
          }

          // Schedule notification ใหม่
          newNotificationId = await scheduleActivityNotification({
            title: form.title,
            activityId: id || 'new',
            triggerDate,
            remindSound: form.remind_sound,
          });
        }
      } else {
        // ถ้าปิดการแจ้งเตือน และมี notification_id เดิม: ยกเลิกทิ้ง
        if (isEditMode && form.notification_id) {
          await cancelScheduledNotification(form.notification_id);
        }
      }

      // 🟡 Phase 2: เตรียมข้อมูลส่ง Backend
      const normalizedSubtasks = (form.subtasks || []).map(s => ({ 
        id: s.id, 
        text: s.text, 
        completed: !!s.completed 
      }));

      const basePayload = {
        ...form,
        subtasks: normalizedSubtasks,
        time: form.all_day ? null : `${form.time}:00`,
        notification_id: newNotificationId, // ส่ง notification_id ไปด้วย
      };

      // 🔵 Phase 3: ส่งข้อมูลไป Backend
      if (isEditMode) {
        const { date, ...updatePayload } = basePayload; 
        await updateActivity(id, updatePayload);
      } else {
        await createActivity(basePayload);
      }

      navigation.goBack();
    } catch (error) {
      // 🔴 ฉุกเฉิน: ถ้าส่ง API ไม่สำเร็จ ให้ยกเลิก notification ที่ตั้งไว้
      if (newNotificationId) {
        await cancelScheduledNotification(newNotificationId);
      }
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };
  
  const selectedCategory = useMemo(() => CATEGORIES.find(c => c.name === form.category) || CATEGORIES[0], [form.category]);

  // --- Subtasks Logic ---
  const handleAddSubtask = () => {
    const text = (subtaskText || '').trim();
    if (!text) return;
    const newSub = { id: `s_${Date.now()}_${Math.random().toString(36).slice(2,8)}`, text, completed: false };
    setForm(prev => ({ ...prev, subtasks: [...(prev.subtasks || []), newSub] }));
    setSubtaskText("");
  };

  const handleRemoveSubtask = (id) => {
    setForm(prev => ({ ...prev, subtasks: (prev.subtasks || []).filter(s => s.id !== id) }));
  };

  const toggleSubtaskCompletedLocal = (id) => {
    setForm(prev => ({ ...prev, subtasks: (prev.subtasks || []).map(s => s.id === id ? { ...s, completed: !s.completed } : s) }));
  };

  const updateSubtaskText = (id, text) => {
    setForm(prev => ({ ...prev, subtasks: (prev.subtasks || []).map(s => s.id === id ? { ...s, text } : s) }));
  };

  // Reminder helpers
  const reminderLabel = REMINDER_OPTIONS.find(r => r.value === form.remind_offset_min)?.label
    || (Number.isFinite(form.remind_offset_min) ? `${form.remind_offset_min} นาทีก่อน` : 'กำหนดเอง');

  const getReminderTimeDisplay = () => {
    if (form.all_day || !form.time) return null;

    const [hours, minutes] = form.time.split(':').map(Number);
    const date = new Date();
    const offsetMinutes = Number(form.remind_offset_min) || 0;
    date.setHours(hours);
    date.setMinutes(minutes - offsetMinutes);

    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');

    return `${h}:${m}`;
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={{ flex: 1, backgroundColor: BG_COLOR }}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            
            {/* 1. Hero Section: Title & Category */}
            <View style={styles.card}>
              <View style={styles.heroHeader}>
                <TouchableOpacity style={styles.emojiButton}>
                  <Text style={{ fontSize: 32 }}>{selectedCategory.emoji}</Text>
                </TouchableOpacity>
                <View style={styles.titleContainer}>
                  <Text style={styles.labelSmall}>ชื่อกิจกรรม <Text style={{color:'red'}}>*</Text></Text>
                  <View style={[
                    styles.inputWrapper, 
                    isTitleTouched && !isValidTitle && styles.inputError,
                    isTitleTouched && isValidTitle && styles.inputSuccess
                  ]}>
                    <TextInput 
                      style={styles.heroInput} 
                      value={form.title} 
                      onChangeText={(t) => { handleInputChange("title", t); setIsTitleTouched(true); }}
                      placeholder="เช่น งานป่วนงาน" 
                      placeholderTextColor="#A0A0A0"
                      autoFocus={!isEditMode}
                    />
                    {isTitleTouched && (
                      <Ionicons 
                        name={isValidTitle ? "checkmark-circle" : "alert-circle"} 
                        size={20} 
                        color={isValidTitle ? "#4CAF50" : "#E74C3C"} 
                      />
                    )}
                  </View>
                </View>
              </View>

              {/* Category Quick Pick */}
              <View style={styles.categoryScroll}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity 
                      key={cat.name} 
                      style={[styles.catChip, form.category === cat.name && styles.catChipSelected]} 
                      onPress={() => handleInputChange('category', cat.name)}
                    >
                      <Text style={{fontSize: 14}}>{cat.emoji}</Text>
                      <Text style={[styles.catText, form.category === cat.name && styles.catTextSelected]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* 2. Date & Time Card */}
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>วันที่ & เวลา</Text>
              
              {/* Date Picker */}
              <TouchableOpacity style={styles.rowBetween} onPress={() => setShowDatePicker(true)}>
                <View style={{flexDirection:'row', alignItems:'center'}}>
                  <View style={[styles.iconBox, {backgroundColor:'#F3E5F5'}]}>
                    <Ionicons name="calendar" size={18} color="#9C27B0" />
                  </View>
                  <Text style={styles.rowLabel}>วันที่</Text>
                </View>
                <View style={styles.dateBadge}>
                  <Text style={styles.dateText}>
                    {new Date(form.date).toLocaleDateString("th-TH", { day: 'numeric', month: 'short', year: '2-digit' })}
                  </Text>
                </View>
              </TouchableOpacity>
              {showDatePicker && <DateTimePicker value={new Date(form.date)} mode="date" onChange={(e, d) => { setShowDatePicker(false); if (d) handleInputChange("date", toDateString(d)); }} />}
              
              <View style={styles.divider} />

              {/* All Day Toggle */}
              <View style={styles.rowBetween}>
                <View style={{flexDirection:'row', alignItems:'center'}}>
                  <View style={[styles.iconBox, {backgroundColor:'#E3F2FD'}]}>
                    <Ionicons name="sunny" size={18} color="#2196F3" />
                  </View>
                  <Text style={styles.rowLabel}>ตลอดทั้งวัน</Text>
                </View>
                <Switch 
                  trackColor={{ false: "#e0e0e0", true: THEME_COLOR + "80" }}
                  thumbColor={form.all_day ? THEME_COLOR : "#f4f3f4"}
                  value={form.all_day} 
                  onValueChange={(val) => handleInputChange("all_day", val)} 
                />
              </View>

              {/* Time Picker */}
              {!form.all_day && (
                <>
                  <View style={styles.divider} />
                  <TouchableOpacity style={styles.rowBetween} onPress={() => setShowTimePicker(true)}>
                    <View style={{flexDirection:'row', alignItems:'center'}}>
                      <View style={[styles.iconBox, {backgroundColor:'#E8F5E9'}]}>
                        <Ionicons name="time" size={18} color="#4CAF50" />
                      </View>
                      <Text style={styles.rowLabel}>เวลาเริ่ม</Text>
                    </View>
                    <View style={styles.timeBadge}>
                      <Text style={styles.timeText}>{form.time}</Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}
              <TimePicker
                visible={showTimePicker}
                value={form.time}
                onChange={(time) => handleInputChange("time", time)}
                onClose={() => setShowTimePicker(false)}
              />
            </View>

            {/* 3. Reminder Settings Card */}
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>การตั้งค่าเพิ่มเติม</Text>
              
              {/* Reminder Toggle */}
              <View style={styles.rowBetween}>
                <View style={{flexDirection:'row', alignItems:'center'}}>
                  <View style={[styles.iconBox, {backgroundColor:'#FFF3E0'}]}>
                    <Ionicons name="notifications" size={18} color="#FF9800" />
                  </View>
                  <Text style={styles.rowLabel}>เปิดการแจ้งเตือน</Text>
                </View>
                <Switch 
                  trackColor={{ false: "#e0e0e0", true: THEME_COLOR + "80" }}
                  thumbColor={form.remind ? THEME_COLOR : "#f4f3f4"}
                  value={form.remind} 
                  onValueChange={(val) => handleInputChange("remind", val)} 
                />
              </View>

              {/* Reminder Time Selection */}
              {form.remind && !form.all_day && (
                <>
                  <View style={styles.divider} />
                  <View>
                    <View style={styles.reminderHeaderRow}>
                      <Text style={styles.subLabel}>แจ้งเตือนล่วงหน้า</Text>
                      {getReminderTimeDisplay() && (
                        <Text style={styles.reminderTimeText}>
                          (เตือนตอน {getReminderTimeDisplay()} น.)
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowReminderMenu(true)}>
                      <Ionicons name="time-outline" size={20} color="#555" />
                      <Text style={{flex:1, marginLeft:10, fontSize:16}}>
                        {reminderLabel}
                      </Text>
                      <Ionicons name="chevron-down" size={18} color="#999" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.divider} />

                  {/* Reminder Sound Toggle */}
                  <View style={styles.rowBetween}>
                    <View style={{flexDirection:'row', alignItems:'center'}}>
                      <View style={[styles.iconBox, {backgroundColor:'#F3E5F5'}]}>
                        <Ionicons name="volume-high" size={18} color="#9C27B0" />
                      </View>
                      <Text style={styles.rowLabel}>เสียงแจ้งเตือน</Text>
                    </View>
                    <Switch 
                      trackColor={{ false: "#e0e0e0", true: THEME_COLOR + "80" }}
                      thumbColor={form.remind_sound ? THEME_COLOR : "#f4f3f4"}
                      value={form.remind_sound} 
                      onValueChange={(val) => handleInputChange("remind_sound", val)} 
                    />
                  </View>
                </>
              )}
            </View>
            
            {/* 4. Subtasks Card */}
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>รายการย่อย ({(form.subtasks || []).filter(t=>t.completed).length}/{(form.subtasks || []).length})</Text>
              
              {/* Add Input */}
              <View style={styles.addSubtaskBox}>
                <Ionicons name="add" size={20} color={THEME_COLOR} />
                <TextInput
                  style={{flex:1, marginLeft: 10, fontSize: 16}} 
                  placeholder="เพิ่มรายการย่อย..." 
                  value={subtaskText}
                  onChangeText={setSubtaskText}
                  onSubmitEditing={handleAddSubtask}
                  placeholderTextColor="#aaa"
                />
                {subtaskText.length > 0 && (
                  <TouchableOpacity onPress={handleAddSubtask}>
                    <Text style={{color: THEME_COLOR, fontWeight:'bold'}}>เพิ่ม</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* List */}
              {(form.subtasks || []).length > 0 ? (
                (form.subtasks || []).map((task) => (
                  <View key={task.id} style={styles.subtaskItem}>
                    <TouchableOpacity onPress={() => toggleSubtaskCompletedLocal(task.id)}>
                      <Ionicons 
                        name={task.completed ? "checkbox" : "square-outline"} 
                        size={22} 
                        color={task.completed ? "#4CAF50" : "#ccc"} 
                      />
                    </TouchableOpacity>
                    <TextInput 
                      style={[styles.subtaskText, task.completed && styles.subtaskTextDone]}
                      value={task.text}
                      onChangeText={(t) => updateSubtaskText(task.id, t)}
                    />
                    <TouchableOpacity onPress={() => handleRemoveSubtask(task.id)}>
                      <Ionicons name="close-circle-outline" size={22} color="#ccc" />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>ยังไม่มีรายการย่อย</Text>
              )}
            </View>

            {/* 5. Notes Card */}
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>รายละเอียดเพิ่มเติม</Text>
              <TextInput
                style={styles.noteInput}
                value={form.notes}
                onChangeText={(v) => handleInputChange('notes', v)}
                placeholder="พิมพ์บันทึกที่นี่..."
                placeholderTextColor="#aaa"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={{height: 100}} />
          </ScrollView>

          {/* Reminder Menu Modal */}
          <Modal visible={showReminderMenu} transparent animationType="fade" onRequestClose={() => setShowReminderMenu(false)}>
            <Pressable style={styles.modalOverlay} onPress={() => setShowReminderMenu(false)}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>เลือกเวลาแจ้งเตือน</Text>
                {REMINDER_OPTIONS.map(opt => (
                  <TouchableOpacity 
                    key={opt.value} 
                    style={[styles.modalItem, form.remind_offset_min === opt.value && styles.modalItemSelected]}
                    onPress={() => {
                      if(opt.value === -1) { 
                        setShowCustomReminderInput(true); 
                        setShowReminderMenu(false); 
                      } else { 
                        handleInputChange('remind_offset_min', opt.value); 
                        setShowReminderMenu(false); 
                      }
                    }}
                  >
                    <Text style={[styles.modalItemText, form.remind_offset_min === opt.value && {color:'#1f6f8b', fontWeight:'bold'}]}>
                      {opt.label}
                    </Text>
                    {form.remind_offset_min === opt.value && <Ionicons name="checkmark" size={20} color="#1f6f8b" />}
                  </TouchableOpacity>
                ))}
              </View>
            </Pressable>
          </Modal>

          {/* Custom Reminder Input Modal */}
          <Modal visible={showCustomReminderInput} transparent animationType="fade" onRequestClose={() => setShowCustomReminderInput(false)}>
            <Pressable style={styles.modalOverlay} onPress={() => Keyboard.dismiss()}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>ระบุนาที</Text>
                <TextInput 
                  style={styles.customInput} 
                  keyboardType="numeric" 
                  placeholder="ตัวอย่าง: 45" 
                  value={customReminderInput}
                  onChangeText={setCustomReminderInput}
                  autoFocus
                />
                <View style={{flexDirection:'row', gap:10}}>
                  <TouchableOpacity 
                    style={[styles.modalBtn, {backgroundColor:'#f0f0f0'}]} 
                    onPress={() => setShowCustomReminderInput(false)}
                  >
                    <Text>ยกเลิก</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalBtn, {backgroundColor:'#1f6f8b'}]} 
                    onPress={() => {
                      const m = parseInt(customReminderInput);
                      if(m >= 0) { 
                        handleInputChange('remind_offset_min', m); 
                        setCustomReminderInput(''); 
                        setShowCustomReminderInput(false); 
                      }
                    }}
                  >
                    <Text style={{color:'#fff'}}>ยืนยัน</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Pressable>
          </Modal>

          {/* Floating Save Button */}
          <View style={styles.footerContainer}>
            <TouchableOpacity 
              style={[styles.saveButton, !isValidTitle && styles.saveButtonDisabled]} 
              onPress={handleSave} 
              disabled={loading || !isValidTitle}
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="save-outline" size={20} color="#fff" style={{marginRight:8}} />
                  <Text style={styles.saveButtonText}>บันทึก</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { padding: 16, paddingBottom: 100 },
  
  // Card Style
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 16 },
  labelSmall: { fontSize: 12, color: '#888', marginBottom: 4 },
  subLabel: { fontSize: 14, color: '#666', marginBottom: 8 },
  reminderHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reminderTimeText: { fontSize: 12, color: '#1f6f8b', marginBottom: 8 },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 12 },

  // Hero Section
  heroHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  emojiButton: {
    width: 60, height: 60, backgroundColor: '#F8F9FA', borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
    borderWidth: 1, borderColor: '#eee'
  },
  titleContainer: { flex: 1 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#eee', paddingBottom: 4 },
  inputError: { borderColor: '#E74C3C' },
  inputSuccess: { borderColor: '#4CAF50' },
  heroInput: { flex: 1, fontSize: 18, fontWeight: '600', color: '#000', paddingVertical: 4 },
  
  // Category
  categoryScroll: { marginTop: 16 },
  catChip: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', 
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8,
    borderWidth: 1, borderColor: 'transparent'
  },
  catChipSelected: { backgroundColor: '#E3F2FD', borderColor: '#1f6f8b' },
  catText: { marginLeft: 6, fontSize: 13, color: '#555' },
  catTextSelected: { color: '#1f6f8b', fontWeight: '600' },

  // Rows
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  rowLabel: { fontSize: 16, marginLeft: 12, color: '#333' },
  iconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  dateBadge: { backgroundColor: '#F2F2F7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  dateText: { fontSize: 16, fontWeight: '600', color: '#1f6f8b' },
  timeBadge: { backgroundColor: '#F2F2F7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  timeText: { fontSize: 16, fontWeight: '600', color: '#1f6f8b' },

  // Subtasks
  addSubtaskBox: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', 
    padding: 10, borderRadius: 12, marginBottom: 12 
  },
  subtaskItem: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', 
    paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', gap: 10
  },
  subtaskText: { flex: 1, fontSize: 15, color: '#333' },
  subtaskTextDone: { textDecorationLine: 'line-through', color: '#aaa' },
  emptyText: { textAlign: 'center', color: '#ccc', fontStyle: 'italic', marginVertical: 10, fontSize: 14 },

  // Dropdown
  dropdownButton: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', 
    padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#eee' 
  },

  // Notes
  noteInput: { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 12, fontSize: 15, color: '#333', minHeight: 100 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalItemText: { fontSize: 16, color: '#333' },
  modalItemSelected: { backgroundColor: '#f9f9f9' },
  customInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 16, textAlign: 'center' },
  modalBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },

  // Footer / Button
  footerContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', padding: 16,
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
    paddingBottom: Platform.OS === 'ios' ? 32 : 16
  },
  saveButton: {
    backgroundColor: '#1f6f8b', borderRadius: 14, height: 50,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#1f6f8b', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 8
  },
  saveButtonDisabled: { backgroundColor: '#B0BEC5', shadowOpacity: 0 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});