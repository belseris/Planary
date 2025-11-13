// screens/EditRoutineScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from "@react-native-community/datetimepicker";
import { createRoutineActivity, updateRoutineActivity } from '../routines';
import { CATEGORIES, TH_DAYS_FULL } from '../utils/constants';
import { toTimeString } from '../utils/dateUtils'; // Import toTimeString

export default function EditRoutineScreen({ route, navigation }) {
    const { routine, day_of_week } = route.params;

    const [title, setTitle] = useState(routine?.title || '');
    const [category, setCategory] = useState(routine?.category || CATEGORIES[0].name);
    const [time, setTime] = useState(routine?.time ? routine.time.slice(0, 5) : toTimeString());
    const [loading, setLoading] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const isEditMode = !!routine;
    const currentDayKey = routine?.day_of_week || day_of_week;
    const dayLabel = TH_DAYS_FULL[currentDayKey] || "กิจกรรม";

    useEffect(() => {
        navigation.setOptions({
            title: isEditMode ? `แก้ไขแม่แบบ (${dayLabel})` : `สร้างแม่แบบ (${dayLabel})`,
        });
    }, [isEditMode, navigation, dayLabel]);

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
                time: time ? `${time}:00` : null,
            };

            console.log('EditRoutine handleSave payload ->', payload, 'isEditMode=', isEditMode, 'currentDayKey=', currentDayKey);

            if (isEditMode) {
                await updateRoutineActivity(routine.id, payload);
            } else {
                // Ensure day_of_week exists before creating. If missing, default to today's day key.
                let dayKeyToSend = currentDayKey;
                if (!dayKeyToSend) {
                    const d = new Date();
                    dayKeyToSend = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][d.getDay()];
                    console.warn('EditRoutine: day_of_week missing, defaulting to', dayKeyToSend);
                }
                await createRoutineActivity({ ...payload, day_of_week: dayKeyToSend });
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

    return (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <ScrollView contentContainerStyle={styles.container}>
                {/* Title and Category */}
                <View style={styles.titleSection}>
                    <Text style={styles.categoryEmoji}>{CATEGORIES.find(c => c.name === category)?.emoji || '🗓️'}</Text>
                    <TextInput style={styles.titleInput} value={title} onChangeText={setTitle} placeholder="ชื่อแม่แบบกิจกรรม..." />
                </View>
                
                {/* Time Section */}
                <View style={styles.section}>
                    <View style={styles.row}>
                        <Ionicons name="time-outline" size={24} color="#555" />
                        <Text style={styles.label}>เวลา</Text>
                        <TouchableOpacity onPress={() => setShowTimePicker(true)}>
                            <Text style={styles.valueText}>{time}</Text>
                        </TouchableOpacity>
                    </View>
                    {showTimePicker && (
                        <DateTimePicker 
                            value={new Date()} // ตั้งค่าเวลาเริ่มต้นของตัวเลือก
                            mode="time" 
                            is24Hour={true} 
                            onChange={(e, t) => { 
                                setShowTimePicker(Platform.OS === 'ios'); // บน iOS ต้องกดปิดเอง
                                if (t) setTime(toTimeString(t)); 
                            }} 
                        />
                    )}
                </View>

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
            </ScrollView>

            <TouchableOpacity style={[styles.saveButton, loading && styles.saveButtonDisabled]} onPress={handleSave} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>บันทึกแม่แบบ</Text>}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { padding: 16, paddingBottom: 100 },
    saveButton: { backgroundColor: '#1f6f8b', padding: 16, margin: 16, borderRadius: 12, alignItems: 'center' },
    saveButtonDisabled: { backgroundColor: '#a9a9a9' },
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
});