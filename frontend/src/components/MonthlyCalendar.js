/**
 * MonthlyCalendar.js - ปฏิทินแบบรายเดือน
 * 
 * คุณสมบัติ:
 * - แสดงวันในเดือนแบบตารางกริด
 * - วันที่มีกิจกรรมจะแสดงจุดเล็กๆ ด้านล่าง
 * - วันที่เลือกไฮไลต์ด้วยวงกลมสีฟ้า
 * - วันปัจจุบันไฮไลต์ด้วยสีจาง
 * - ลูกศรเปลี่ยนเดือน
 */

import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TH_DAYS } from '../utils/constants';
import { getMonthActivities } from '../api';

const MonthlyCalendar = ({ 
  selectedDate, 
  onDateSelect, 
  onMonthChange 
}) => {
  const currentDate = new Date(selectedDate);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const [daysWithActivities, setDaysWithActivities] = useState({ routine: [], regular: [] });
  const [loading, setLoading] = useState(false);

  // โหลดวันที่มีกิจกรรมเมื่อเดือนเปลี่ยน
  useEffect(() => {
    const loadActivitiesDates = async () => {
      setLoading(true);
      try {
        const response = await getMonthActivities(year, month + 1); // month + 1 เพราะ backend ใช้ 1-12
        setDaysWithActivities(response);
      } catch (e) {
        console.warn('Failed to load month activities:', e);
        setDaysWithActivities({ routine: [], regular: [] });
      } finally {
        setLoading(false);
      }
    };
    
    loadActivitiesDates();
  }, [year, month]);

  // คำนวณวันในเดือน
  const calendar = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // เพิ่มช่องว่างสำหรับวันก่อน
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // เพิ่มวันของเดือน
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    // เพิ่มช่องว่างสำหรับวันหลัง (ให้ปฏิทินเต็ม 6 แถว)
    const totalCells = days.length;
    const totalRows = Math.ceil(totalCells / 7);
    const totalCellsNeeded = totalRows * 7;
    for (let i = totalCells; i < totalCellsNeeded; i++) {
      days.push(null);
    }

    return days;
  }, [year, month]);

  const monthNameTH = new Date(year, month, 1).toLocaleDateString('th-TH', {
    month: 'long',
    year: 'numeric'
  });

  const handlePrevMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    onMonthChange(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    onMonthChange(newDate);
  };

  const handleDateSelect = (day) => {
    if (!day) return;
    // สร้าง date string แบบ ISO (YYYY-MM-DD) เพื่อหลีกเลี่ยง timezone issue
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onDateSelect(dateStr);
  };

  const today = new Date();
  const isCurrentMonth = 
    today.getFullYear() === year && 
    today.getMonth() === month;

  const selectedDay = currentDate.getDate();

  return (
    <View style={styles.container}>
      {/* Header - เดือนและปี */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color="#1f6f8b" />
        </TouchableOpacity>
        
        <Text style={styles.monthYearText}>{monthNameTH}</Text>
        
        <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color="#1f6f8b" />
        </TouchableOpacity>
      </View>

      {/* ชื่อวัน */}
      <View style={styles.weekDaysRow}>
        {TH_DAYS.map((day) => (
          <Text key={day} style={styles.weekDayText}>
            {day}
          </Text>
        ))}
      </View>

      {/* ตารางวัน */}
      <View style={styles.calendarGrid}>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#1f6f8b" />
          </View>
        )}
        {!loading && calendar.map((day, index) => {
          const isSelected = day === selectedDay;
          const isToday = isCurrentMonth && day === today.getDate();
          // สร้าง date string แบบ ISO เพื่อหลีกเลี่ยง timezone issue
          const dateString = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
          const hasRoutine = dateString && daysWithActivities.routine?.includes(dateString);
          const hasRegular = dateString && daysWithActivities.regular?.includes(dateString);

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayCell,
                isSelected && styles.daySelected,
                isToday && !isSelected && styles.dayToday,
              ]}
              onPress={() => day && handleDateSelect(day)}
              disabled={!day}
            >
              {day && (
                <View style={styles.dayContent}>
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.daySelectedText,
                      isToday && !isSelected && styles.dayTodayText,
                    ]}
                  >
                    {day}
                  </Text>
                  <View style={styles.dotsContainer}>
                    {hasRoutine && <View style={[styles.activityDot, styles.routineDot]} />}
                    {hasRegular && <View style={[styles.activityDot, styles.regularDot]} />}
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f6f8b',
    textAlign: 'center',
    flex: 1,
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayCell: {
    width: '14.285%', // 100% / 7 days
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderRadius: 8,
  },
  dayContent: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  dotsContainer: {
    flexDirection: 'row',
    marginTop: 2,
    gap: 2,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  daySelected: {
    backgroundColor: '#1f6f8b',
  },
  daySelectedText: {
    color: '#fff',
    fontWeight: '700',
  },
  dayToday: {
    backgroundColor: '#e8f4f8',
    borderWidth: 2,
    borderColor: '#1f6f8b',
  },
  dayTodayText: {
    color: '#1f6f8b',
    fontWeight: '600',
  },
  activityDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  routineDot: {
    backgroundColor: '#1f6f8b', // สีฟ้า สำหรับกิจกรรมประจำวัน
  },
  regularDot: {
    backgroundColor: '#ff6b6b', // สีแดง สำหรับกิจกรรมอื่น
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
});

export default MonthlyCalendar;
