// screens/EditRoutineScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, Platform, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TimePicker from '../components/TimePicker';
import { createRoutineActivity, updateRoutineActivity, deleteRoutineActivity } from '../api';
import { CATEGORIES, TH_DAYS_FULL, TH_DAYS, WEEK_DAYS } from '../utils/constants';
import { toTimeString } from '../utils/dateUtils'; // Import toTimeString

export default function EditRoutineScreen({ route, navigation }) {
    const { routine, day_of_week } = route.params;

    const [title, setTitle] = useState(routine?.title || '');
    const [category, setCategory] = useState(routine?.category || CATEGORIES[0].name);
    const [time, setTime] = useState(routine?.time ? routine.time.slice(0, 5) : toTimeString());
    const [allDay, setAllDay] = useState(false);
    const [notes, setNotes] = useState(routine?.notes || '');
    const [subtasks, setSubtasks] = useState(routine?.subtasks || []);
    const [subtaskText, setSubtaskText] = useState('');
    const [selectedDays, setSelectedDays] = useState([day_of_week || 'mon']);
    const [loading, setLoading] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const isEditMode = !!routine;
    const currentDayKey = routine?.day_of_week || day_of_week;
    const dayLabel = TH_DAYS_FULL[currentDayKey] || "กิจกรรม";

    useEffect(() => {
        navigation.setOptions({
            title: isEditMode ? `แก้ไขแม่แบบ (${dayLabel})` : `สร้างแม่แบบ (${dayLabel})`,
            // เพิ่มปุ่มลบใน header (เฉพาะโหมดแก้ไข)
            headerRight: isEditMode ? () => (
                <TouchableOpacity onPress={handleDelete} style={{ marginRight: 16 }}>
                    <Ionicons name="trash-outline" size={24} color="#e74c3c" />
                </TouchableOpacity>
            ) : undefined,
        });
    }, [isEditMode, navigation, dayLabel]);

    const handleDelete = () => {
        Alert.alert(
            'ยืนยันการลบ',
            'คุณแน่ใจหรือไม่ว่าต้องการลบแม่แบบกิจกรรมนี้?',
            [
                { text: 'ยกเลิก', style: 'cancel' },
                {
                    text: 'ลบ',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteRoutineActivity(routine.id);
                            navigation.goBack();
                        } catch (error) {
                            Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถลบแม่แบบได้');
                        }
                    },
                },
            ]
        );
    };

    const addSubtask = () => {
        if (!subtaskText.trim()) return;
        const newSubtask = { id: Date.now().toString(), text: subtaskText.trim(), completed: false };
        setSubtasks([...subtasks, newSubtask]);
    };

    const updateSubtask = (id, text) => {
        setSubtasks(subtasks.map(st => st.id === id ? { ...st, text } : st));
    };

    const removeSubtask = (id) => {
        setSubtasks(subtasks.filter(st => st.id !== id));
    };

    const toggleDay = (dayKey) => {
        if (selectedDays.includes(dayKey)) {
            // ต้องมีอย่างน้อย 1 วัน
            if (selectedDays.length > 1) {
                setSelectedDays(selectedDays.filter(d => d !== dayKey));
            }
        } else {
            setSelectedDays([...selectedDays, dayKey]);
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกชื่อกิจกรรม');
            return;
        }
        setLoading(true);
        try {
            const payload = {
                title: title.trim(),
                category: category,
                time: allDay ? null : (time ? `${time}:00` : null),
                notes: notes.trim() || null,
                subtasks: subtasks.length > 0 ? subtasks : null,
            };

            console.log('EditRoutine handleSave payload ->', payload, 'isEditMode=', isEditMode, 'selectedDays=', selectedDays);

            if (isEditMode) {
                await updateRoutineActivity(routine.id, payload);
            } else {
                // สร้าง routine สำหรับทุกวันที่เลือก
                const createPromises = selectedDays.map(dayKey => 
                    createRoutineActivity({ ...payload, day_of_week: dayKey })
                );
                await Promise.all(createPromises);
            }
            navigation.goBack();
        } catch (error) {
            console.error('EditRoutine save error:', error);
            // error may be a string or an object from axios/apiClient
            let msg = '';
            try {
                if (typeof error === 'string') msg = error;
                else if (error?.detail) msg = JSON.stringify(error.detail);
                else if (error?.message) msg = error.message;
                else msg = JSON.stringify(error);
            } catch (e) {
                msg = String(error);
            }
            Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้' + (msg ? `\n${msg}` : ''));
        } finally {
            setLoading(false);
        }
    };

    const selectedCategory = CATEGORIES.find(c => c.name === category) || CATEGORIES[0];

    return (
        <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
            <ScrollView contentContainerStyle={styles.container}>
                {/* Title and Category */}
                <View style={styles.titleSection}>
                    <Text style={styles.categoryEmoji}>{selectedCategory.emoji}</Text>
                    <TextInput style={styles.titleInput} value={title} onChangeText={setTitle} placeholder="ชื่อกิจกรรม..." />
                </View>
                
                {/* Time Section */}
                <View style={styles.section}>
                    <View style={styles.row}>
                        <Ionicons name="time-outline" size={24} color="#555" />
                        <Text style={styles.label}>ทั้งวัน</Text>
                        <Switch value={allDay} onValueChange={setAllDay} />
                    </View>
                    {!allDay && (
                        <View style={[styles.row, { paddingLeft: 40, borderBottomWidth: 0 }]}>
                            <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.timeButton}>
                                <Ionicons name="time" size={20} color="#1f6f8b" style={{ marginRight: 8 }} />
                                <Text style={styles.timeText}>{time}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
                
                <TimePicker
                    visible={showTimePicker}
                    value={time}
                    onChange={setTime}
                    onClose={() => setShowTimePicker(false)}
                />

                {/* Category Selector */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>หมวดหมู่</Text>
                    <View style={styles.chipContainer}>
                        {CATEGORIES.map(cat => (
                            <TouchableOpacity key={cat.name} style={[styles.chip, category === cat.name && styles.chipSelected]} onPress={() => setCategory(cat.name)}>
                                <Text style={[styles.chipText, category === cat.name && styles.chipTextSelected]}>{cat.emoji} {cat.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Day Selector */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>เลือกวันที่ทำซ้ำ</Text>
                    <View style={styles.chipContainer}>
                        {WEEK_DAYS.map(day => (
                            <TouchableOpacity 
                                key={day.key} 
                                style={[styles.chip, selectedDays.includes(day.key) && styles.chipSelected]} 
                                onPress={() => toggleDay(day.key)}
                            >
                                <Text style={[styles.chipText, selectedDays.includes(day.key) && styles.chipTextSelected]}>
                                    {day.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Notes */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>รายละเอียด</Text>
                    <TextInput
                        style={styles.notesInput}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="เขียนรายละเอียดเพิ่มเติม..."
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>

                {/* Subtasks */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>งานย่อย</Text>
                    <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                        <TextInput
                            style={styles.subtaskNewInput}
                            value={subtaskText}
                            onChangeText={setSubtaskText}
                            placeholder="เพิ่มงานย่อย..."
                            onSubmitEditing={() => {
                                if (subtaskText.trim()) {
                                    addSubtask();
                                    setSubtaskText('');
                                }
                            }}
                        />
                        <TouchableOpacity style={styles.addSubtaskButton} onPress={() => {
                            if (subtaskText.trim()) {
                                addSubtask();
                                setSubtaskText('');
                            }
                        }}>
                            <Ionicons name="add" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    {subtasks.length > 0 ? (
                        subtasks.map((st, idx) => (
                            <View key={st.id} style={styles.subtaskRow}>
                                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="reorder-two" size={20} color="#999" style={{ marginRight: 12 }} />
                                    <TextInput
                                        style={styles.subtaskInput}
                                        value={st.text}
                                        onChangeText={(text) => updateSubtask(st.id, text)}
                                        placeholder={`งานย่อย ${idx + 1}...`}
                                    />
                                </View>
                                <TouchableOpacity onPress={() => removeSubtask(st.id)} style={{ marginLeft: 8 }}>
                                    <Ionicons name="close-circle" size={24} color="#ff4d4f" />
                                </TouchableOpacity>
                            </View>
                        ))
                    ) : (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                            <Ionicons name="list-outline" size={48} color="#ddd" />
                            <Text style={{ color: '#999', marginTop: 8, fontSize: 14 }}>ยังไม่มีงานย่อย</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            <TouchableOpacity style={[styles.saveButton, loading && styles.saveButtonDisabled]} onPress={handleSave} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>บันทึกแม่แบบ</Text>}
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
    saveButtonDisabled: { 
        backgroundColor: '#a9a9a9',
        shadowOpacity: 0.1,
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
    notesInput: { 
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 16,
        fontSize: 15,
        color: '#2a2a2a',
        lineHeight: 22,
        borderWidth: 2,
        borderColor: '#e0e0e0',
        minHeight: 120,
        textAlignVertical: 'top',
    },
    subtaskNewInput: { 
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
    subtaskInput: { 
        flex: 1,
        fontSize: 16,
        color: '#2a2a2a',
        padding: 0,
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