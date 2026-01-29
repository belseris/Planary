/**
 * DebugScreen.js - หน้าจอทดสอบ Notification แบบพื้นๆ
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

export default function DebugScreen() {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');

  const log = (text) => {
    setOutput((prev) => (prev ? `${prev}\n${text}` : text));
  };

  const clear = () => setOutput('');

  // กันกรณี API คืนค่าเป็น array ตรงๆ หรือเป็น axios response { data: [...] }
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
        log('สาเหตุที่เป็นไปได้:');
        log('- ยังไม่มีกิจกรรม');
        log('- กิจกรรมปิด remind (remind=false)');
        log('- เป็น all-day หรือ done/cancelled');
        log('- เวลาไม่เข้าเงื่อนไข upcoming ของ backend');
        return;
      }

      log(`✅ Found ${activities.length} activity(ies)`);
      activities.forEach((a, i) => {
        log(`\n${i + 1}) ${a?.title ?? '(no title)'}`);
        log(`   time: ${a?.time ?? '-'}`);
        log(`   minutes_until: ${a?.minutes_until ?? '-'}`);
        log(`   remind: ${a?.remind ?? '-'}`);
        log(`   status: ${a?.status ?? '-'}`);
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
      const { showActivityNotification } = require('../services/notificationService');

      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

      const fakeActivity = {
        id: 'debug-test-1',
        title: 'ทดสอบแจ้งเตือน ✅',
        time,
        remind: true,
        remind_sound: true,
        minutes_until: 0,
      };

      await showActivityNotification(fakeActivity);
      log('✅ Sent! (ดูที่ notification bar)');
    } catch (e) {
      log(`❌ Error: ${e?.message || String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleManualNotify = async () => {
    setLoading(true);
    clear();
    log('Manual notify from upcoming activities...');
    try {
      const { showActivityNotification } = require('../services/notificationService');

      const res = await getUpcomingActivities();
      const activities = extractActivities(res);

      if (activities.length === 0) {
        log('❌ ไม่พบกิจกรรมที่จะส่งแจ้งเตือน');
        log('ลองสร้างกิจกรรมทดสอบ: ตั้งเวลาอีก 10-15 นาที + เปิด remind ✅');
        return;
      }

      // แบบพื้นๆ: ส่งแค่ตัวแรกพอ
      const a = activities[0];
      log(`Sending: ${a?.title ?? a?.id ?? '(unknown)'}`);
      await showActivityNotification(a);
      log('✅ Sent! (ดูที่ notification bar)');
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
          <Text style={styles.btnText}>Request Permission</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={handleCheckActivities} disabled={loading}>
          <Text style={styles.btnText}>Check Activities</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={handleManualNotify} disabled={loading}>
          <Text style={styles.btnText}>Manual Notify</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={handleInstantNotify} disabled={loading}>
          <Text style={styles.btnText}>Instant Test</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={clear} disabled={loading}>
          <Text style={styles.btnText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={{ padding: 10 }}>
          <ActivityIndicator />
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
  title: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  buttons: { marginBottom: 10 },
  btn: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  btnText: { fontSize: 14, fontWeight: '600' },
  output: { flex: 1, borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10 },
  outputText: { fontFamily: 'monospace', fontSize: 12, lineHeight: 18 },
});
