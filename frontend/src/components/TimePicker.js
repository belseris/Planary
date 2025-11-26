/**
 * TimePicker.js - Component สำหรับเลือกเวลาแบบง่าย
 * 
 * หน้าที่:
 * - แสดง dropdown สำหรับเลือกชั่วโมง (00-23)
 * - แสดง dropdown สำหรับเลือกนาที (00, 15, 30, 45)
 * - ใช้งานง่ายกว่า native TimePicker
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TimePicker({ value, onChange, visible, onClose }) {
  // แยก HH:MM
  const [hours, minutes] = (value || "00:00").split(':');
  
  const hourOptions = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minuteOptions = Array.from({ length: 61 }, (_, i) => String(i).padStart(2, '0'));

  const handleHourChange = (hour) => {
    onChange(`${hour}:${minutes}`);
  };

  const handleMinuteChange = (minute) => {
    onChange(`${hours}:${minute}`);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={styles.container} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <Text style={styles.title}>เลือกเวลา</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.pickerContainer}>
            {/* ชั่วโมง */}
            <View style={styles.pickerColumn}>
              <Text style={styles.columnLabel}>ชั่วโมง</Text>
              <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {hourOptions.map((hour) => (
                  <TouchableOpacity
                    key={hour}
                    style={[
                      styles.option,
                      hours === hour && styles.optionSelected
                    ]}
                    onPress={() => handleHourChange(hour)}
                  >
                    <Text style={[
                      styles.optionText,
                      hours === hour && styles.optionTextSelected
                    ]}>
                      {hour}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={styles.separator}>:</Text>

            {/* นาที */}
            <View style={styles.pickerColumn}>
              <Text style={styles.columnLabel}>นาที</Text>
              <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {minuteOptions.map((minute) => (
                  <TouchableOpacity
                    key={minute}
                    style={[
                      styles.option,
                      minutes === minute && styles.optionSelected
                    ]}
                    onPress={() => handleMinuteChange(minute)}
                  >
                    <Text style={[
                      styles.optionText,
                      minutes === minute && styles.optionTextSelected
                    ]}>
                      {minute}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <TouchableOpacity style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneButtonText}>เสร็จสิ้น</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#000',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 40,
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  columnLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 10,
    fontWeight: '600',
  },
  scrollView: {
    maxHeight: 200,
    width: '100%',
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
  },
  optionSelected: {
    backgroundColor: '#1f6f8b',
  },
  optionText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  separator: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginHorizontal: 20,
    marginTop: 30,
  },
  doneButton: {
    backgroundColor: '#1f6f8b',
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
