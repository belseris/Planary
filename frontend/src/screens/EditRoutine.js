// screens/EditRoutineScreen.js
import React, { useState, useEffect } from 'react';
import { 
    View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, 
    ScrollView, ActivityIndicator, Platform, Switch, Modal, Pressable, 
    KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // แนะนำให้ใช้ถ้ามี (ถ้าไม่มีให้ลบออกและใช้ View ธรรมดา)

import TimePicker from '../components/TimePicker';
import { createRoutineActivity, updateRoutineActivity, deleteRoutineActivity } from '../api';
import { CATEGORIES, TH_DAYS_FULL, WEEK_DAYS, REMINDER_OPTIONS } from '../utils/constants';
import { toTimeString } from '../utils/dateUtils';
import { scheduleWeeklyRoutineNotification, cancelScheduledNotification } from '../services/notificationService';

export default function EditRoutineScreen({ route, navigation }) {
    // Params & State Initialization
    const { routine, day_of_week } = route.params;
    const isEditMode = !!routine;

    const [title, setTitle] = useState(routine?.title || '');
    const [isTitleTouched, setIsTitleTouched] = useState(false); // เช็คว่า user เริ่มพิมพ์หรือยัง
    const [category, setCategory] = useState(routine?.category || CATEGORIES[0].name);
    const [time, setTime] = useState(routine?.time ? routine.time.slice(0, 5) : toTimeString());
    const [allDay, setAllDay] = useState(false);
    const [notes, setNotes] = useState(routine?.notes || '');
    const [subtasks, setSubtasks] = useState(routine?.subtasks || []);
    const [subtaskText, setSubtaskText] = useState('');
    const [selectedDays, setSelectedDays] = useState([routine?.day_of_week || day_of_week || 'mon']);
    
    // UI States
    const [loading, setLoading] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [remind, setRemind] = useState((routine?.reminder_minutes ?? 0) > 0);
    
    // Reminder States
    const [reminderMinutes, setReminderMinutes] = useState(routine?.reminder_minutes ?? 15);
    const [showReminderMenu, setShowReminderMenu] = useState(false);
    const [showCustomReminderInput, setShowCustomReminderInput] = useState(false);
    const [customReminderInput, setCustomReminderInput] = useState('');
    const [remindSound, setRemindSound] = useState(routine?.remind_sound !== undefined ? routine.remind_sound : true);
    const [notificationId, setNotificationId] = useState(routine?.notification_id || null);

    const dayLabel = TH_DAYS_FULL[routine?.day_of_week || day_of_week] || "กิจกรรม";
    const isValidTitle = title.trim().length > 0;

    // Header Setup
    useEffect(() => {
        navigation.setOptions({
            headerTitle: isEditMode ? 'แก้ไขกิจวัตร' : 'สร้างกิจวัตรใหม่',
            headerStyle: { backgroundColor: '#F2F2F7', shadowOpacity: 0, elevation: 0 }, // กลืนกับพื้นหลัง
            headerTintColor: '#000',
            headerRight: isEditMode ? () => (
                <TouchableOpacity onPress={handleDelete} style={styles.headerDeleteBtn}>
                    <Ionicons name="trash-outline" size={22} color="#e74c3c" />
                </TouchableOpacity>
            ) : undefined,
        });
    }, [isEditMode, navigation]);

    // Handlers
    const handleDelete = () => {
        Alert.alert('ยืนยันการลบ', 'คุณแน่ใจหรือไม่ว่าต้องการลบแม่แบบกิจกรรมนี้?', [
            { text: 'ยกเลิก', style: 'cancel' },
            { text: 'ลบ', style: 'destructive', onPress: async () => {
                try {
                    if (notificationId) {
                        await cancelScheduledNotification(notificationId);
                    }
                    await deleteRoutineActivity(routine.id);
                    navigation.goBack();
                } catch (error) {
                    Alert.alert('ผิดพลาด', 'ไม่สามารถลบได้');
                }
            }}
        ]);
    };

    const addSubtask = () => {
        if (!subtaskText.trim()) return;
        setSubtasks([...subtasks, { id: Date.now().toString(), text: subtaskText.trim(), completed: false }]);
        setSubtaskText('');
    };

    const updateSubtask = (id, text) => setSubtasks(subtasks.map(st => st.id === id ? { ...st, text } : st));
    const removeSubtask = (id) => setSubtasks(subtasks.filter(st => st.id !== id));

    const toggleDay = (dayKey) => {
        if (selectedDays.includes(dayKey)) {
            if (selectedDays.length > 1) setSelectedDays(selectedDays.filter(d => d !== dayKey));
        } else {
            setSelectedDays([...selectedDays, dayKey]);
        }
    };

    const handleSave = async () => {
        setIsTitleTouched(true);
        if (!isValidTitle) {
            Alert.alert('ข้อมูลไม่ครบ', 'กรุณากรอกชื่อกิจกรรม');
            return;
        }
        
        setLoading(true);
        try {
            const payload = {
                title: title.trim(),
                category,
                time: allDay ? null : (time ? `${time}:00` : null),
                notes: notes.trim() || null,
                subtasks: subtasks.length > 0 ? subtasks : null,
                reminder_minutes: remind ? reminderMinutes : 0,
                remind_sound: remindSound,
            };

            if (isEditMode) {
                await updateRoutineActivity(routine.id, payload);

                if (remind && !allDay && time) {
                    if (notificationId) {
                        await cancelScheduledNotification(notificationId);
                    }
                    const newNotificationId = await scheduleWeeklyRoutineNotification({
                        title: title.trim(),
                        weekdayKey: routine?.day_of_week || selectedDays[0],
                        time,
                        remindOffsetMin: reminderMinutes,
                        remindSound,
                    });
                    await updateRoutineActivity(routine.id, { notification_id: newNotificationId || null });
                    setNotificationId(newNotificationId || null);
                } else if (notificationId) {
                    await cancelScheduledNotification(notificationId);
                    await updateRoutineActivity(routine.id, { notification_id: null });
                    setNotificationId(null);
                }
            } else {
                const createPromises = selectedDays.map(dayKey => 
                    createRoutineActivity({ ...payload, day_of_week: dayKey })
                );
                const created = await Promise.all(createPromises);

                if (remind && !allDay && time) {
                    for (const row of created) {
                        const rowTime = row?.time ? String(row.time).slice(0, 5) : time;
                        const newNotificationId = await scheduleWeeklyRoutineNotification({
                            title: row.title,
                            weekdayKey: row.day_of_week,
                            time: rowTime,
                            remindOffsetMin: reminderMinutes,
                            remindSound,
                        });
                        if (newNotificationId) {
                            await updateRoutineActivity(row.id, { notification_id: newNotificationId });
                        }
                    }
                }
            }
            navigation.goBack();
        } catch (error) {
            console.error(error);
            Alert.alert('บันทึกไม่สำเร็จ', 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setLoading(false);
        }
    };

    const selectedCategory = CATEGORIES.find(c => c.name === category) || CATEGORIES[0];
    const reminderLabel = REMINDER_OPTIONS.find(r => r.value === reminderMinutes)?.label
        || (Number.isFinite(reminderMinutes) ? `${reminderMinutes} นาที` : 'กำหนดเอง');

    const getReminderTimeDisplay = () => {
        if (allDay || !time) return null;

        const [hours, minutes] = time.split(':').map(Number);
        const date = new Date();
        const offsetMinutes = Number(reminderMinutes) || 0;
        date.setHours(hours);
        date.setMinutes(minutes - offsetMinutes);

        const h = date.getHours().toString().padStart(2, '0');
        const m = date.getMinutes().toString().padStart(2, '0');

        return `${h}:${m}`;
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"} 
            style={{ flex: 1, backgroundColor: '#F2F2F7' }}
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
                                            value={title} 
                                            onChangeText={(t) => { setTitle(t); setIsTitleTouched(true); }}
                                            placeholder=""
                                            placeholderTextColor="#A0A0A0"
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
                                            style={[styles.catChip, category === cat.name && styles.catChipSelected]} 
                                            onPress={() => setCategory(cat.name)}
                                        >
                                            <Text style={{fontSize: 14}}>{cat.emoji}</Text>
                                            <Text style={[styles.catText, category === cat.name && styles.catTextSelected]}>
                                                {cat.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>

                        {/* 2. Schedule Section */}
                        <View style={styles.card}>
                            <Text style={styles.sectionHeader}>เวลา & วันที่</Text>
                            
                            {/* All Day Toggle */}
                            <View style={styles.rowBetween}>
                                <View style={{flexDirection:'row', alignItems:'center'}}>
                                    <View style={[styles.iconBox, {backgroundColor:'#E3F2FD'}]}>
                                        <Ionicons name="sunny" size={18} color="#2196F3" />
                                    </View>
                                    <Text style={styles.rowLabel}>ตลอดทั้งวัน</Text>
                                </View>
                                <Switch value={allDay} onValueChange={setAllDay} trackColor={{false: '#e0e0e0', true: '#1f6f8b'}} />
                            </View>

                            {/* Time Picker */}
                            {!allDay && (
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
                                            <Text style={styles.timeText}>{time}</Text>
                                        </View>
                                    </TouchableOpacity>
                                </>
                            )}

                            <View style={styles.divider} />
                            
                            {/* Day Selector */}
                            <View style={{ marginTop: 16 }}>
                                <Text style={styles.subLabel}>ทำซ้ำทุกวัน</Text>
                                <View style={styles.dayContainer}>
                                    {WEEK_DAYS.map(day => {
                                        const isSelected = selectedDays.includes(day.key);
                                        return (
                                            <TouchableOpacity 
                                                key={day.key} 
                                                style={[styles.dayCircle, isSelected && styles.dayCircleSelected]} 
                                                onPress={() => toggleDay(day.key)}
                                            >
                                                <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                                                    {day.label}
                                                </Text>
                                            </TouchableOpacity>
                                        )
                                    })}
                                </View>
                            </View>
                        </View>

                        {/* 3. Details Section (Reminder) */}
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
                                <Switch value={remind} onValueChange={setRemind} trackColor={{false: '#e0e0e0', true: '#1f6f8b'}} />
                            </View>

                            {/* Reminder Time Selection */}
                            {remind && !allDay && (
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
                                        <Switch value={remindSound} onValueChange={setRemindSound} trackColor={{false: '#e0e0e0', true: '#1f6f8b'}} />
                                    </View>
                                </>
                            )}
                        </View>

                        {/* 4. Subtasks Section */}
                        <View style={styles.card}>
                            <Text style={styles.sectionHeader}>รายการย่อย ({subtasks.filter(t=>t.completed).length}/{subtasks.length})</Text>
                            
                            {/* Add Input */}
                            <View style={styles.addSubtaskBox}>
                                <Ionicons name="add" size={20} color="#1f6f8b" />
                                <TextInput 
                                    style={{flex:1, marginLeft: 10, fontSize: 16}} 
                                    placeholder="เพิ่มรายการย่อย..." 
                                    value={subtaskText}
                                    onChangeText={setSubtaskText}
                                    onSubmitEditing={addSubtask}
                                />
                                {subtaskText.length > 0 && (
                                    <TouchableOpacity onPress={addSubtask}>
                                        <Text style={{color:'#1f6f8b', fontWeight:'bold'}}>เพิ่ม</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* List */}
                            {subtasks.map((st, idx) => (
                                <View key={st.id} style={styles.subtaskItem}>
                                    <View style={styles.dragHandle} />
                                    <TextInput 
                                        style={{flex:1, fontSize: 16, color: '#333'}}
                                        value={st.text}
                                        onChangeText={(t) => updateSubtask(st.id, t)}
                                    />
                                    <TouchableOpacity onPress={() => removeSubtask(st.id)}>
                                        <Ionicons name="close-circle-outline" size={22} color="#ccc" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>

                        {/* 5. Notes */}
                        <View style={styles.card}>
                            <Text style={styles.sectionHeader}>โน้ต</Text>
                            <TextInput
                                style={styles.notesArea}
                                value={notes}
                                onChangeText={setNotes}
                                placeholder="รายละเอียดเพิ่มเติม..."
                                multiline
                                textAlignVertical="top"
                            />
                        </View>

                        <View style={{height: 100}} /> 
                    </ScrollView>

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

            {/* Modals (TimePicker, Reminder, CustomInput) */}
            <TimePicker visible={showTimePicker} value={time} onChange={setTime} onClose={() => setShowTimePicker(false)} />
            
            {/* Reminder Menu Modal (Simplified logic here) */}
            <Modal visible={showReminderMenu} transparent animationType="fade" onRequestClose={() => setShowReminderMenu(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setShowReminderMenu(false)}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>เลือกเวลาแจ้งเตือน</Text>
                        {REMINDER_OPTIONS.map(opt => (
                            <TouchableOpacity 
                                key={opt.value} 
                                style={[styles.modalItem, reminderMinutes === opt.value && styles.modalItemSelected]}
                                onPress={() => {
                                    if(opt.value === -1) { setShowCustomReminderInput(true); setShowReminderMenu(false); }
                                    else { setReminderMinutes(opt.value); setShowReminderMenu(false); }
                                }}
                            >
                                <Text style={[styles.modalItemText, reminderMinutes === opt.value && {color:'#1f6f8b', fontWeight:'bold'}]}>
                                    {opt.label}
                                </Text>
                                {reminderMinutes === opt.value && <Ionicons name="checkmark" size={20} color="#1f6f8b" />}
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
                            <TouchableOpacity style={[styles.modalBtn, {backgroundColor:'#f0f0f0'}]} onPress={() => setShowCustomReminderInput(false)}>
                                <Text>ยกเลิก</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalBtn, {backgroundColor:'#1f6f8b'}]} 
                                onPress={() => {
                                    const m = parseInt(customReminderInput);
                                    if(m >= 0) { setReminderMinutes(m); setCustomReminderInput(''); setShowCustomReminderInput(false); }
                                }}
                            >
                                <Text style={{color:'#fff'}}>ยืนยัน</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Pressable>
            </Modal>
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
    timeBadge: { backgroundColor: '#F2F2F7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    timeText: { fontSize: 16, fontWeight: '600', color: '#1f6f8b' },

    // Day Selector
    dayContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    dayCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center' },
    dayCircleSelected: { backgroundColor: '#1f6f8b' },
    dayText: { fontSize: 14, color: '#666' },
    dayTextSelected: { color: '#fff', fontWeight: 'bold' },

    // Dropdown
    dropdownButton: { 
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', 
        padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#eee' 
    },

    // Subtasks
    addSubtaskBox: { 
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', 
        padding: 10, borderRadius: 12, marginBottom: 12 
    },
    subtaskItem: { 
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', 
        paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' 
    },
    dragHandle: { width: 4, height: 20, backgroundColor: '#eee', borderRadius: 2, marginRight: 12 },

    // Notes
    notesArea: { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 12, height: 100, fontSize: 15 },

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
    headerDeleteBtn: { marginRight: 16, padding: 4 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '80%', backgroundColor: '#fff', borderRadius: 20, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
    modalItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    modalItemText: { fontSize: 16, color: '#333' },
    modalItemSelected: { backgroundColor: '#f9f9f9' },
    customInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 16, textAlign: 'center' },
    modalBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' }
});