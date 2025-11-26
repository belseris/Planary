import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getDashboardSummary } from '../api/trends';

export default function TrendsScreen() {
  const [period, setPeriod] = useState('week'); // 'week' | 'month'
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // --- Helper Functions (เหมือนเดิม) ---
  const getDisplayPeriod = () => {
    const now = new Date();
    if (period === 'week') {
      if (offset === 0) return 'สัปดาห์นี้';
      if (offset === -1) return 'สัปดาห์ที่แล้ว';
      return `${Math.abs(offset)} สัปดาห์ก่อน`;
    } else {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
      return `${monthNames[d.getMonth()]} ${d.getFullYear() + 543}`;
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // เพิ่ม delay เล็กน้อยเพื่อให้เห็น smooth transition
      await new Promise(resolve => setTimeout(resolve, 300));
      const result = await getDashboardSummary(period, offset);
      setData(result);
    } catch (error) {
      console.log('Error fetching trends:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period, offset]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // --- Loading & Empty States ---
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1f6f8b" />
        <Text style={styles.loadingText}>กำลังวิเคราะห์ข้อมูล...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.emptyIconBg}><Ionicons name="bar-chart" size={48} color="#1f6f8b" /></View>
        <Text style={styles.emptyTitle}>ยังไม่มีข้อมูล</Text>
        <Text style={styles.emptySubtitle}>บันทึกกิจกรรมและอารมณ์เพื่อดูสถิติ</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}><Text style={styles.retryButtonText}>ลองใหม่</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* --- Header --- */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>สรุปผล</Text>
        
        <View style={styles.segmentContainer}>
          <TouchableOpacity style={[styles.segmentButton, period === 'week' && styles.segmentActive]} onPress={() => { setPeriod('week'); setOffset(0); }}>
            <Text style={[styles.segmentText, period === 'week' && styles.segmentTextActive]}>รายสัปดาห์</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.segmentButton, period === 'month' && styles.segmentActive]} onPress={() => { setPeriod('month'); setOffset(0); }}>
            <Text style={[styles.segmentText, period === 'month' && styles.segmentTextActive]}>รายเดือน</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.navContainer}>
          <TouchableOpacity onPress={() => setOffset(offset - 1)} style={styles.navButton}>
            <Ionicons name="chevron-back" size={20} color="#555" />
          </TouchableOpacity>
          <Text style={styles.periodText}>{getDisplayPeriod()}</Text>
          <TouchableOpacity onPress={() => offset < 0 && setOffset(offset + 1)} style={[styles.navButton, offset >= 0 && styles.navButtonDisabled]} disabled={offset >= 0}>
            <Ionicons name="chevron-forward" size={20} color={offset >= 0 ? "#ccc" : "#555"} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <MoodSummaryCard data={data.mood} />
        {/* <MoodFactorsCard data={data.mood_factors} /> */}
        <CompletionCard data={data.completion} />
        <LifeBalanceCard data={data.life_balance} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================== Components (No Charts Version) ====================

function MoodSummaryCard({ data }) {
  if (!data || data.total_entries === 0) return null;
  const { average, trend } = data;
  
  const getMoodIcon = (avg) => {
    if (avg >= 4.5) return { icon: 'happy', color: '#4caf50', label: 'ยอดเยี่ยม' }; // เขียว
    if (avg >= 3.5) return { icon: 'happy-outline', color: '#8bc34a', label: 'ดี' }; // เขียวอ่อน
    if (avg >= 2.5) return { icon: 'partly-sunny', color: '#ffc107', label: 'ปานกลาง' }; // เหลือง
    if (avg >= 1.5) return { icon: 'sad-outline', color: '#ff9800', label: 'ไม่ค่อยดี' }; // ส้ม
    return { icon: 'thunderstorm', color: '#f44336', label: 'แย่' }; // แดง
  };

  const moodInfo = getMoodIcon(average);
     // const trendText = trend === 'improving' ? 'ดีขึ้นจากช่วงก่อน 📈' : trend === 'declining' ? 'ลดลงจากช่วงก่อน 📉' : '';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBg, { backgroundColor: moodInfo.color + '20' }]}>
            <Ionicons name={moodInfo.icon} size={24} color={moodInfo.color} />
        </View>
        <Text style={styles.cardTitle}>ภาพรวมอารมณ์</Text>
      </View>
      
      <View style={styles.bigStatContainer}>
        <Text style={[styles.bigStatNumber, { color: moodInfo.color }]}>{average.toFixed(1)}</Text>
        <Text style={styles.bigStatLabel}>/ 5.0</Text>
      </View>
      <Text style={[styles.moodLabel, { color: moodInfo.color }]}>{moodInfo.label}</Text>
      
         {/* เปรียบเทียบกับรอบก่อนหน้า ถูกปิดไว้ตามคำขอ */}
    </View>
  );
}

function MoodFactorsCard({ data }) {
  if (!data) return null;
  const { positive, negative } = data;
  if (positive.length === 0 && negative.length === 0) return null;

  const renderFactorRow = (item, color, maxCount) => (
    <View key={item.emoji} style={styles.progressRow}>
      <Text style={styles.progressEmoji}>{item.emoji}</Text>
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarFill, { width: `${(item.count / maxCount) * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.progressCount}>{item.count}</Text>
    </View>
  );

  // หาค่าสูงสุดเพื่อคำนวณความยาว Bar
  const maxPos = positive.length > 0 ? positive[0].count : 1;
  const maxNeg = negative.length > 0 ? negative[0].count : 1;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBg, { backgroundColor: '#e3f2fd' }]}><Ionicons name="pricetag" size={20} color="#2196f3" /></View>
        <Text style={styles.cardTitle}>ปัจจัยต่อความรู้สึก</Text>
      </View>

      <View style={styles.rowSpace}>
        <View style={styles.halfCol}>
          <Text style={[styles.colHeader, { color: '#4caf50' }]}>พลังบวก (+)</Text>
          {positive.length > 0 ? positive.slice(0, 3).map(i => renderFactorRow(i, '#81c784', maxPos)) : <Text style={styles.noDataText}>ไม่มีข้อมูล</Text>}
        </View>
        <View style={styles.halfCol}>
          <Text style={[styles.colHeader, { color: '#e57373' }]}>พลังลบ (-)</Text>
          {negative.length > 0 ? negative.slice(0, 3).map(i => renderFactorRow(i, '#ef9a9a', maxNeg)) : <Text style={styles.noDataText}>ไม่มีข้อมูล</Text>}
        </View>
      </View>
    </View>
  );
}

function CompletionCard({ data }) {
  if (!data || data.total === 0) return null;
  const { completion_rate, data: details } = data;

  // เรียงลำดับเพื่อแสดงผล (ใช้ label ที่ตรงกับ Backend)
  const completed = details.find(d => d.label === 'เสร็จแล้ว')?.count || 0;
  const inProgress = details.find(d => d.label === 'กำลังทำ')?.count || 0;
  const pending = details.find(d => d.label === 'ยังไม่เริ่ม')?.count || 0;
  const cancelled = details.find(d => d.label === 'ยกเลิก')?.count || 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBg, { backgroundColor: '#e8f5e9' }]}><Ionicons name="checkbox" size={20} color="#4caf50" /></View>
        <Text style={styles.cardTitle}>วินัยของคุณ</Text>
      </View>

      <View style={styles.bigStatContainer}>
        <Text style={styles.bigStatNumber}>{completion_rate.toFixed(0)}%</Text>
        <Text style={styles.bigStatLabel}>เป้าหมายสำเร็จ</Text>
      </View>

      {/* Progress Bar รวม */}
      <View style={styles.multiProgressBar}>
        <View style={{ flex: completed, backgroundColor: '#52c41a' }} />
        <View style={{ flex: inProgress, backgroundColor: '#faad14' }} />
        <View style={{ flex: pending, backgroundColor: '#595959' }} />
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor:'#52c41a'}]}/><Text style={styles.legendText}>เสร็จแล้ว ({completed})</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor:'#faad14'}]}/><Text style={styles.legendText}>กำลังทำ ({inProgress})</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor:'#595959'}]}/><Text style={styles.legendText}>ยังไม่เริ่ม ({pending})</Text></View>
      </View>
    </View>
  );
}

function LifeBalanceCard({ data }) {
  if (!data || data.total === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBg, { backgroundColor: '#fff3e0' }]}><Ionicons name="pie-chart" size={20} color="#ff9800" /></View>
        <Text style={styles.cardTitle}>เวลาชีวิต (Top 4)</Text>
      </View>

      {data.data.slice(0, 4).map((cat, idx) => (
        <View key={idx} style={styles.balanceRow}>
          <Text style={{ fontSize: 18, width: 30 }}>{cat.emoji}</Text>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 14, color: '#333' }}>{cat.label}</Text>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#555' }}>{cat.percentage}%</Text>
            </View>
            <View style={{ height: 8, backgroundColor: '#f0f0f0', borderRadius: 4 }}>
              <View style={{ height: '100%', width: `${cat.percentage}%`, backgroundColor: cat.color, borderRadius: 4 }} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

// ==================== Styles ====================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fa' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f7f8fa' },
  
  // Header
  header: { backgroundColor: '#fff', paddingHorizontal: 20, paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, zIndex: 10 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#1f6f8b', marginBottom: 16, marginTop: 8 },
  segmentContainer: { flexDirection: 'row', backgroundColor: '#f0f2f5', borderRadius: 12, padding: 4, marginBottom: 16 },
  segmentButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  segmentActive: { backgroundColor: '#fff', shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  segmentText: { fontSize: 14, fontWeight: '600', color: '#999' },
  segmentTextActive: { color: '#1f6f8b' },
  navContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee', borderRadius: 50, paddingHorizontal: 8, paddingVertical: 6, alignSelf: 'center' },
  navButton: { padding: 8, backgroundColor: '#f5f5f5', borderRadius: 20 },
  navButtonDisabled: { opacity: 0.3 },
  periodText: { fontSize: 15, fontWeight: '600', color: '#333', marginHorizontal: 16, minWidth: 100, textAlign: 'center' },

  // Content
  content: { padding: 20, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconBg: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  
  // Mood Summary Specific
  bigStatContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' },
  bigStatNumber: { fontSize: 48, fontWeight: '800', lineHeight: 56 },
  bigStatLabel: { fontSize: 16, color: '#999', marginBottom: 10, marginLeft: 4 },
  moodLabel: { textAlign: 'center', fontSize: 18, fontWeight: '600', marginTop: 4 },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 12 },
  trendText: { textAlign: 'center', fontSize: 14, color: '#666' },

  // Factors Specific
  rowSpace: { flexDirection: 'row', justifyContent: 'space-between' },
  halfCol: { width: '48%' },
  colHeader: { fontSize: 13, fontWeight: '700', marginBottom: 12, textTransform: 'uppercase' },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  progressEmoji: { fontSize: 16, width: 22 },
  progressBarContainer: { flex: 1, height: 6, backgroundColor: '#f0f0f0', borderRadius: 3, marginRight: 8 },
  progressBarFill: { height: '100%', borderRadius: 3 },
  progressCount: { fontSize: 12, color: '#999', fontWeight: '600', width: 14, textAlign: 'right' },
  noDataText: { fontSize: 12, color: '#ccc', fontStyle: 'italic' },

  // Completion Specific
  multiProgressBar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', width: '100%', marginVertical: 16 },
  legendRow: { flexDirection: 'row', justifyContent: 'space-around' },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendText: { fontSize: 12, color: '#666' },

  // Balance Specific
  balanceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },

  // Empty State
  emptyIconBg: { width: 100, height: 100, backgroundColor: '#e0f7fa', borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#333', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#777', marginBottom: 24 },
  retryButton: { backgroundColor: '#1f6f8b', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 50 },
  retryButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  loadingText: { marginTop: 16, fontSize: 16, color: '#777', fontWeight: '500' },
});