// screens/EditActivityScreen.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, ScrollView, TextInput, Switch, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { createActivity, getActivity, updateActivity } from "../activities";
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
    // ✅ 2. ลบ repeat_config ออก
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
    const payload = {
      ...form,
      subtasks: normalizedSubtasks,
      time: form.all_day ? null : `${form.time}:00`,
      // ✅ 3. ลบ repeat_config ออกจาก payload
    };

    try {
      if (isEditMode) { await updateActivity(id, payload); } 
      else { await createActivity(payload); }
      navigation.goBack();
    } catch (error) { Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้"); }
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
              <TouchableOpacity onPress={() => setShowTimePicker(true)}>
                <Text style={styles.valueText}>{form.time}</Text>
              </TouchableOpacity>
            </View>
          )}
          {showTimePicker && <DateTimePicker value={new Date()} mode="time" is24Hour={true} onChange={(e, t) => { setShowTimePicker(false); if (t) handleInputChange("time", toTimeString(t)); }} />}
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
        
        {/* ✅ 4. ลบ Section "ทำซ้ำ" (Repeat) ออก */}
        
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

// (Styles ใช้ของเดิมได้เลย)
const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 100 },
  saveButton: { backgroundColor: '#1f6f8b', padding: 16, margin: 16, borderRadius: 12, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  titleSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  categoryEmoji: { fontSize: 32, marginRight: 12 },
  titleInput: { flex: 1, fontSize: 24, fontWeight: 'bold', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 8 },
  section: { backgroundColor: '#f9f9f9', borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#444' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  label: { flex: 1, marginLeft: 16, fontSize: 16 },
  valueText: { fontSize: 16, fontWeight: '500' },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, margin: 4 },
  chipSelected: { backgroundColor: '#1f6f8b' },
  chipText: { color: '#333' },
  chipTextSelected: { color: '#fff' },
  // Subtasks & Notes styles
  subtaskInput: { flex: 1, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#eee' },
  addSubtaskButton: { marginLeft: 8, backgroundColor: '#1f6f8b', padding: 10, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  subtaskRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#fff', borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#f0f0f0' },
  subtaskText: { flex: 1, fontSize: 16 },
  subtaskTextCompleted: { textDecorationLine: 'line-through', color: '#aaa' },
  notesInput: { backgroundColor: '#fff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#eee', minHeight: 100 },
});