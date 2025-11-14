// src/screens/Trends.js

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Minimal mock stats for a compact dashboard
const mock = {
  emoji: '😊',
  completion: 78,
  done: 24,
  total: 31,
};

export default function TrendsScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.header}>แนวโน้ม</Text>

      <View style={styles.row}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>อารมณ์เฉลี่ย</Text>
          <Text style={styles.emoji}>{mock.emoji}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>อัตราสำเร็จ</Text>
          <Text style={styles.big}>{mock.completion}%</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>เสร็จแล้ว</Text>
          <Text style={styles.big}>{mock.done}/{mock.total}</Text>
        </View>
      </View>

      <Text style={styles.note}>ข้อมูล</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F7F7', padding: 16 },
  header: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 12, flex: 1, marginHorizontal: 4, alignItems: 'center' },
  cardLabel: { fontSize: 12, color: '#666', marginBottom: 6 },
  emoji: { fontSize: 30 },
  big: { fontSize: 20, fontWeight: '700', color: '#1f6f8b' },
  note: { marginTop: 18, fontSize: 12, color: '#888' },
});