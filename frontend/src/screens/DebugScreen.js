/**
 * DebugScreen.js - หน้าจอทดสอบ Notification แบบคลีนๆ
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import { requestPermissionIfNeeded } from '../services/debugNotifications';
import { getUpcomingActivities } from '../api/activities';
import { 
  showActivityNotification, 
  scheduleActivityNotification, 
  getPendingNotifications, 
  cancelAllNotifications 
} from '../services/notificationService';

export default function DebugScreen() {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');

  const log = (text) => {
    setOutput((prev) => (prev ? `${prev}\n${text}` : text));
  };

  const clear = () => setOutput('');

  const extractActivities = (res) => {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.activities)) return res.activities;
    return [];
  };

  const handleRequestPermission = async () => {
    setLoading(true);
    clear();
    log('Requesting permission...');
    try {
      const ok = await requestPermissionIfNeeded();
      log(ok ? '✅ Permission granted' : '❌ Permission denied');
    } catch (e) {
      log(`❌ Error: ${e?.message || String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckActivities = async () => {
    setLoading(true);
    clear();
    log('Fetching upcoming activities...');
    try {
      const res = await getUpcomingActivities();
      const activities = extractActivities(res);

      if (activities.length === 0) {
        log('⚠️ No upcoming activities found');
        return;
      }

      log(`✅ Found ${activities.length} activity(ies)`);
      activities.forEach((a, i) => {
        log(`\n${i + 1}) ${a?.title ?? '(no title)'}`);
        log(`   time: ${a?.time ?? '-'}`);
        log(`   minutes_until: ${a?.minutes_until ?? '-'}`);
        log(`   remind: ${a?.remind ?? '-'}`);
        log(`   id: ${a?.id ?? '-'}`);
      });
    } catch (e) {
      log(`❌ Error: ${e?.message || String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInstantNotify = async () => {
    setLoading(true);
    clear();
    log('Sending instant test notification...');
    try {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

      const fakeActivity = {
        id: 'debug-test-1',
        title: 'ทดสอบแจ้งเตือนด่วน ✅',
        time,
        remind: true,
        remind_sound: true,
        minutes_until: 0,
      };

      await showActivityNotification(fakeActivity);
      log('✅ Sent! (น่าจะเด้งแล้ว ดูด้านบน)');
    } catch (e) {
      log(`❌ Error: ${e?.message || String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleTest = async () => {
    setLoading(true);
    clear();
    // 💡 ปรับเวลาเป็น 15 วินาที เพื่อให้แอนดรอยด์ตั้งนาฬิกาปลุกจริงๆ (บางรุ่นต่ำกว่านี้มันเด้งเลย)
    log('🧪 ทดสอบ Scheduled Notification (รอ 15 วินาที)...');
    try {
      const triggerDate = new Date(Date.now() + 15 * 1000); 

      const notifId = await scheduleActivityNotification({
        title: 'ทดสอบตั้งเวลาล่วงหน้า ⏰',
        activityId: 'test-scheduled',
        triggerDate,
        remindSound: true,
      });

      if (notifId) {
        log(`✅ Scheduled สำเร็จ! (ID: ${notifId})`);
        log(`⏰ รอประมาณ 15 วินาที... (ไม่ต้องทำอะไร เดี๋ยวมันเด้งเอง)`);
        log('ℹ️ ถ้าเด้งทันที แปลว่าเครื่อง ignore timeInterval trigger');
      } else {
        log('❌ ไม่สามารถ schedule ได้');
      }
    } catch (e) {
      log(`❌ Error: ${e?.message || String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckPending = async () => {
    setLoading(true);
    clear();
    log('📋 ตรวจสอบ Pending Notifications...');
    try {
      const pending = await getPendingNotifications();

      if (pending.length === 0) {
        log('✅ ไม่มี notification ที่รออยู่');
        return;
      }

      log(`✅ พบ ${pending.length} notification(s) ที่รออยู่:`);
      pending.forEach((n, i) => {
        log(`\n${i + 1}) ${n.content?.title || '(no title)'}`);
        log(`   ID: ${n.identifier}`);
      });
    } catch (e) {
      log(`❌ Error: ${e?.message || String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAll = async () => {
    setLoading(true);
    clear();
    log('🗑️ ยกเลิก Notification ทั้งหมด...');
    try {
      await cancelAllNotifications();
      log('✅ ยกเลิกทั้งหมดเรียบร้อย');
    } catch (e) {
      log(`❌ Error: ${e?.message || String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Debug Notifications</Text>

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.btn} onPress={handleRequestPermission} disabled={loading}>
          <Text style={styles.btnText}>1. Request Permission</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={handleCheckActivities} disabled={loading}>
          <Text style={styles.btnText}>Check API Activities</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={handleInstantNotify} disabled={loading}>
          <Text style={styles.btnText}>⚡ Instant Test (เด้งทันที)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleScheduleTest} disabled={loading}>
          <Text style={styles.btnTextWhite}>⏳ Scheduled Test (รอ 15s)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={handleCheckPending} disabled={loading}>
          <Text style={styles.btnText}>📋 Check Pending</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={handleCancelAll} disabled={loading}>
          <Text style={styles.btnTextWhite}>🗑️ Cancel All</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.btn, { backgroundColor: '#8e44ad', borderColor: '#8e44ad' }]} 
          onPress={async () => {
            setLoading(true);
            clear();
            log('🚀 เริ่ม Raw Test (รอ 15 วินาที)...');
            try {
              const Notifications = require('expo-notifications');
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: "🤖 Raw Test สำเร็จ!",
                  body: "ถ้ารอครบ 15 วิแล้วเพิ่งเด้ง แปลว่าเครื่องปกติแล้ว!",
                },
                trigger: {
                  type: 'timeInterval',
                  seconds: 15,
                  repeats: false,
                  channelId: 'default',
                },
              });
              log('✅ Raw Scheduled! รอดูว่าเด้งทันทีไหม...');
            } catch (e) {
              log(`❌ Error: ${e.message}`);
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
        >
          <Text style={styles.btnTextWhite}>🚀 Raw Test ดิบ (15s)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={clear} disabled={loading}>
          <Text style={styles.btnText}>Clear Log</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={{ padding: 10 }}>
          <ActivityIndicator color="#1f6f8b" />
        </View>
      )}

      <ScrollView style={styles.output}>
        <Text style={styles.outputText}>{output || 'Output จะขึ้นตรงนี้...'}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 15 },
  buttons: { marginBottom: 10 },
  btn: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  btnPrimary: {
    backgroundColor: '#1f6f8b',
    borderColor: '#1f6f8b',
  },
  btnDanger: {
    backgroundColor: '#e74c3c',
    borderColor: '#e74c3c',
  },
  btnText: { fontSize: 14, fontWeight: '600', color: '#333' },
  btnTextWhite: { fontSize: 14, fontWeight: '600', color: '#fff' },
  output: { flex: 1, borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10, backgroundColor: '#fafafa' },
  outputText: { fontFamily: 'monospace', fontSize: 12, lineHeight: 18, color: '#333' },
});