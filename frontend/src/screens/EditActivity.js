// screens/EditActivityScreen.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, ScrollView, TextInput, Switch, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import TimePicker from "../components/TimePicker";
import { createActivity, getActivity, updateActivity } from "../api";
import { CATEGORIES, STATUSES } from "../utils/constants"; // ✅ 1. Import จาก constants
import { toDateString, toTimeString } from "../utils/dateUtils";

export default function EditActivityScreen({ route, navigation }) {
  const id = route.params?.id;
  const initialDate = route.params?.date || toDateString();

  const [form, setForm] = useState({
    title: "",
    category: CATEGORIES[0].name,
    date: initialDate,
    all_day: false,
    time: toTimeString(),
    status: "normal",
    notes: "",
    subtasks: [],
    remind: false,
    remind_offset_min: 15,
    remind_sound: true,
    remind_type: "simple",
  });
  const [subtaskText, setSubtaskText] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const isEditMode = useMemo(() => !!id, [id]);

  useEffect(() => {
    console.log('EditActivity mounted, isEditMode=', isEditMode, 'id=', id);
    navigation.setOptions({ title: isEditMode ? "แก้ไขกิจกรรม" : "สร้างกิจกรรมใหม่" });
    if (isEditMode) {
      const loadData = async () => {
        try {
          const data = await getActivity(id);
          setForm({
            title: data.title || "",
            category: data.category || CATEGORIES[0].name,
            date: data.date || toDateString(),
            all_day: data.all_day || false,
            time: data.time ? data.time.slice(0, 5) : toTimeString(),
            status: data.status || "normal",
            notes: data.notes || "",
            subtasks: data.subtasks || [],
            remind: data.remind || false,
            remind_offset_min: data.remind_offset_min || 15,
            remind_sound: data.remind_sound !== undefined ? data.remind_sound : true,
            remind_type: data.remind_type || "simple",
          });
        } catch (error) { Alert.alert("Error", "ไม่สามารถโหลดข้อมูลได้"); }
      };
      loadData();
    }
  }, [id, navigation, isEditMode]);

  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      Alert.alert("ข้อมูลไม่ครบ", "กรุณากรอกชื่อกิจกรรม");
      return;
    }
    // Normalize subtasks: strip ephemeral fields (editing, editText)
    const normalizedSubtasks = (form.subtasks || []).map(s => ({ id: s.id, text: s.text, completed: !!s.completed }));
    const basePayload = {
      ...form,
      subtasks: normalizedSubtasks,
      time: form.all_day ? null : `${form.time}:00`,
      // ✅ 3. ลบ repeat_config ออกจาก payload
    };

    try {
      if (isEditMode) {
        const { date, ...updatePayload } = basePayload; // omit `date` on update to satisfy API
        await updateActivity(id, updatePayload);
      } else {
        await createActivity(basePayload);
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้");
    }
  };
  
  const selectedCategory = useMemo(() => CATEGORIES.find(c => c.name === form.category) || CATEGORIES[0], [form.category]);

  // Subtasks handlers
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

  // Toggle completed status for a subtask (in edit screen)
  const toggleSubtaskCompletedLocal = (id) => {
    setForm(prev => ({ ...prev, subtasks: (prev.subtasks || []).map(s => s.id === id ? { ...s, completed: !s.completed } : s) }));
  };

  // Inline edit: start editing a subtask
  const startEditSubtask = (id) => {
    setForm(prev => ({ ...prev, subtasks: (prev.subtasks || []).map(s => s.id === id ? { ...s, editing: true, editText: s.text } : s) }));
  };

  const cancelEditSubtask = (id) => {
    setForm(prev => ({ ...prev, subtasks: (prev.subtasks || []).map(s => { const copy = { ...s }; delete copy.editing; delete copy.editText; return copy; }) }));
  };

  const saveEditSubtask = (id) => {
    setForm(prev => ({ ...prev, subtasks: (prev.subtasks || []).map(s => s.id === id ? { ...s, text: (s.editText||'').trim(), editing: false, editText: undefined } : s) }));
  };

  const updateEditingText = (id, text) => {
    setForm(prev => ({ ...prev, subtasks: (prev.subtasks || []).map(s => s.id === id ? { ...s, editText: text } : s) }));
  };

  // Reorder helpers: move up/down
  const moveSubtask = (id, direction) => {
    setForm(prev => {
      const arr = [...(prev.subtasks || [])];
      const idx = arr.findIndex(s => s.id === id);
      if (idx === -1) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= arr.length) return prev;
      const item = arr.splice(idx, 1)[0];
      arr.splice(newIdx, 0, item);
      return { ...prev, subtasks: arr };
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Title and Category */}
        <View style={styles.titleSection}>
          <Text style={styles.categoryEmoji}>{selectedCategory.emoji}</Text>
          <TextInput style={styles.titleInput} value={form.title} onChangeText={(val) => handleInputChange("title", val)} placeholder="ชื่องาน..." />
        </View>

        {/* Date and Time */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Ionicons name="calendar-outline" size={24} color="#555" />
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.valueText}>{new Date(form.date).toLocaleDateString("th-TH", { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
            </TouchableOpacity>
          </View>
          {showDatePicker && <DateTimePicker value={new Date(form.date)} mode="date" onChange={(e, d) => { setShowDatePicker(false); if (d) handleInputChange("date", toDateString(d)); }} />}
          <View style={styles.row}>
            <Ionicons name="time-outline" size={24} color="#555" />
            <Text style={styles.label}>ทั้งวัน</Text>
            <Switch value={form.all_day} onValueChange={(val) => handleInputChange("all_day", val)} />
          </View>
          {!form.all_day && (
            <View style={[styles.row, { paddingLeft: 40 }]}>
              <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.timeButton}>
                <Ionicons name="time" size={20} color="#1f6f8b" style={{ marginRight: 8 }} />
                <Text style={styles.timeText}>{form.time}</Text>
              </TouchableOpacity>
            </View>
          )}
          <TimePicker
            visible={showTimePicker}
            value={form.time}
            onChange={(time) => handleInputChange("time", time)}
            onClose={() => setShowTimePicker(false)}
          />
        </View>

        {/* Category Selector */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>หมวดหมู่</Text>
            <View style={styles.chipContainer}>
                {CATEGORIES.map(cat => (
                    <TouchableOpacity key={cat.name} style={[styles.chip, form.category === cat.name && styles.chipSelected]} onPress={() => handleInputChange('category', cat.name)}>
                        <Text style={[styles.chipText, form.category === cat.name && styles.chipTextSelected]}>{cat.emoji} {cat.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
        
        
        {/* Notification Settings
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 การแจ้งเตือน</Text>
          <View style={styles.row}>
            <Ionicons name="notifications-outline" size={24} color="#555" />
            <Text style={styles.label}>เปิดการแจ้งเตือน</Text>
            <Switch 
              value={form.remind} 
              onValueChange={(val) => handleInputChange("remind", val)} 
            />
          </View>
          
          {form.remind && (
            <>
              <View style={styles.row}>
                <Ionicons name="time-outline" size={24} color="#555" />
                <Text style={styles.label}>แจ้งก่อน</Text>
                <View style={styles.pickerContainer}>
                  {[5, 10, 15, 30, 60].map(min => (
                    <TouchableOpacity
                      key={min}
                      style={[
                        styles.timeChip,
                        form.remind_offset_min === min && styles.timeChipSelected
                      ]}
                      onPress={() => handleInputChange("remind_offset_min", min)}
                    >
                      <Text style={[
                        styles.timeChipText,
                        form.remind_offset_min === min && styles.timeChipTextSelected
                      ]}>
                        {min < 60 ? `${min} นาที` : `${min / 60} ชั่วโมง`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View style={styles.row}>
                <Ionicons name="volume-high-outline" size={24} color="#555" />
                <Text style={styles.label}>เสียงแจ้งเตือน</Text>
                <Switch 
                  value={form.remind_sound} 
                  onValueChange={(val) => handleInputChange("remind_sound", val)} 
                />
              </View>
            </>
          )}
        </View> */}
        
        {/* Subtasks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>งานย่อย</Text>
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <TextInput
              style={styles.subtaskInput}
              value={subtaskText}
              onChangeText={setSubtaskText}
              placeholder="เพิ่มงานย่อย..."
            />
            <TouchableOpacity style={styles.addSubtaskButton} onPress={handleAddSubtask}>
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          {(form.subtasks || []).length > 0 ? (
            (form.subtasks || []).map((task, idx) => (
              <View key={task.id} style={styles.subtaskRow}>
                <TouchableOpacity onPress={() => toggleSubtaskCompletedLocal(task.id)} style={{ marginRight: 12 }}>
                  <Ionicons name={task.completed ? "checkbox" : "square-outline"} size={22} color={task.completed ? "#52c41a" : "#666"} />
                </TouchableOpacity>

                {/* Inline edit */}
                {task.editing ? (
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    <TextInput
                      style={[styles.subtaskInput, { flex: 1, paddingVertical: 6 }]}
                      value={task.editText}
                      onChangeText={(t) => updateEditingText(task.id, t)}
                      placeholder="แก้ไขงานย่อย..."
                    />
                    <TouchableOpacity onPress={() => saveEditSubtask(task.id)} style={{ marginLeft: 8 }}>
                      <Ionicons name="checkmark" size={22} color="#1f6f8b" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => cancelEditSubtask(task.id)} style={{ marginLeft: 8 }}>
                      <Ionicons name="close" size={22} color="#999" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <Text style={[styles.subtaskText, task.completed && styles.subtaskTextCompleted]}>{task.text}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity onPress={() => startEditSubtask(task.id)} style={{ marginRight: 12 }}>
                        <Ionicons name="pencil-outline" size={20} color="#666" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => moveSubtask(task.id, 'up')} style={{ marginRight: 8 }}>
                        <Ionicons name="chevron-up" size={20} color="#666" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => moveSubtask(task.id, 'down')} style={{ marginRight: 12 }}>
                        <Ionicons name="chevron-down" size={20} color="#666" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleRemoveSubtask(task.id)}>
                        <Ionicons name="trash-outline" size={20} color="#d9534f" />
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>ยังไม่มีงานย่อย</Text>
          )}
        </View>

        {/* Notes (รายละเอียด) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>รายละเอียด</Text>
          <TextInput
            style={styles.notesInput}
            value={form.notes}
            onChangeText={(v) => handleInputChange('notes', v)}
            placeholder="รายละเอียดเพิ่มเติม..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>บันทึก</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 20, 
    paddingBottom: 100,
    backgroundColor: '#f8f9fa',
  },
  saveButton: { 
    backgroundColor: '#1f6f8b',
    padding: 18,
    margin: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#1f6f8b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  titleSection: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  categoryEmoji: { 
    fontSize: 40, 
    marginRight: 16,
  },
  titleInput: { 
    flex: 1, 
    fontSize: 20, 
    fontWeight: '600',
    color: '#1a1a1a',
    paddingVertical: 4,
  },
  section: { 
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    marginBottom: 16, 
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: { 
    flex: 1, 
    marginLeft: 16, 
    fontSize: 16,
    color: '#4a4a4a',
    fontWeight: '500',
  },
  valueText: { 
    fontSize: 16, 
    fontWeight: '600',
    color: '#1f6f8b',
  },
  chipContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: { 
    backgroundColor: '#f0f3f7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipSelected: { 
    backgroundColor: '#e8f4f8',
    borderColor: '#1f6f8b',
  },
  chipText: { 
    color: '#4a4a4a',
    fontSize: 15,
    fontWeight: '500',
  },
  chipTextSelected: { 
    color: '#1f6f8b',
    fontWeight: '700',
  },
  pickerContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginLeft: 8,
  },
  timeChip: {
    backgroundColor: '#f0f3f7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  timeChipSelected: {
    backgroundColor: '#e8f4f8',
    borderColor: '#1f6f8b',
  },
  timeChipText: {
    color: '#4a4a4a',
    fontSize: 13,
    fontWeight: '500',
  },
  timeChipTextSelected: {
    color: '#1f6f8b',
    fontWeight: '700',
  },
  subtaskInput: { 
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  addSubtaskButton: { 
    marginLeft: 12,
    backgroundColor: '#1f6f8b',
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1f6f8b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  subtaskRow: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  subtaskText: { 
    flex: 1, 
    fontSize: 16,
    color: '#2a2a2a',
    marginLeft: 4,
  },
  subtaskTextCompleted: { 
    textDecorationLine: 'line-through', 
    color: '#999',
  },
  notesInput: { 
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  timeButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f4f8',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1f6f8b',
  },
  timeText: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1f6f8b',
    letterSpacing: 1,
  },
});