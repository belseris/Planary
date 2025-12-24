import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { listActivities, createDiary } from '../api';
import { generateActivitySummary } from '../summarizeActivities';

export default function YesterdayDiaryModal({ visible, onClose, dateISO }) {
  // คะแนน 3 มิติ
  const [posScore, setPosScore] = useState(0);
  const [negScore, setNegScore] = useState(0);
  const [overall, setOverall] = useState(0);

  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const [overallY, setOverallY] = useState(0);

  // tags ฝั่งดี–แย่
  const POSITIVE_TAGS = ['ของกินอร่อย', 'งานเสร็จ', 'พักผ่อน', 'แฟนน่ารัก', 'ออกกำลังกาย'];
  const NEGATIVE_TAGS = ['รถติด', 'โดนดุ', 'นอนน้อย', 'ป่วย', 'ทะเลาะกัน', 'งานเดือด'];

  const [posTags, setPosTags] = useState([]);
  const [negTags, setNegTags] = useState([]);

  // เวลาเปลี่ยนวันหรือ modal เปิดใหม่ ให้รีเซ็ตค่า
  useEffect(() => {
    if (visible) {
      setPosScore(0);
      setNegScore(0);
      setOverall(0);
      setPosTags([]);
      setNegTags([]);
      setLoading(false);
    }
  }, [visible, dateISO]);

  const dateHeader = useMemo(() => {
    try {
      return new Date(dateISO).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateISO;
    }
  }, [dateISO]);

  // แปลง tag เป็น emoji เพื่อเก็บใน mood_tags
  const tagEmojiMap = {
    'ของกินอร่อย': '🍜',
    'งานเสร็จ': '✅',
    'พักผ่อน': '🛌',
    'แฟนน่ารัก': '💖',
    'ออกกำลังกาย': '💪',
    'รถติด': '🚗',
    'โดนดุ': '😓',
    'นอนน้อย': '😴',
    'ป่วย': '🤒',
    'ทะเลาะกัน': '⚡',
    'งานเดือด': '🔥',
  };

  const toEmojis = (tags) => tags.map((t) => tagEmojiMap[t]).filter(Boolean);

  // เลือก emoji หลักจากคะแนนภาพรวม 1–5
  const getMoodEmoji = (score) => {
    if (!score) return null;
    if (score >= 4) return '😄';
    if (score === 3) return '😐';
    return '😞';
  };

  const handleSave = async () => {
    try {
      if (!overall) {
        Alert.alert('ขอคะแนนภาพรวม', 'ช่วยให้ดาวสรุปของเมื่อวานหน่อยครับ');
        if (scrollRef.current) {
          scrollRef.current.scrollTo({ y: overallY - 20, animated: true });
        }
        return;
      }

      setLoading(true);

      // 1) ดึงกิจกรรมของวันที่ต้องการ
      const actsResp = await listActivities({ qdate: dateISO });
      const activities = actsResp?.items || [];

      // แปลงรูปแบบกิจกรรมให้พร้อมเก็บใน diary
      const processedActivities = activities.map((act) => ({
        id: String(act.id),
        title: act.title,
        status: act.status,
        category: act.category,
        activityMood: '🙂', // ตอนนี้ยังเป็นค่าคงที่ ไว้ต่อยอดทีหลัง
      }));

      // 2) สรุปกิจกรรมเป็นข้อความ
      const summaryText = generateActivitySummary(processedActivities);

      // 3) ต่อข้อความรีวิวจากฟอร์มอารมณ์
      const reviewLines = [
        `สรุปคะแนนความรู้สึกของวันนั้น`,
        `- ด้านดี: ${posScore || 0} ดาว`,
        `- ด้านแย่: ${negScore || 0} ดาว`,
        `- ภาพรวมทั้งวัน: ${overall || 0} ดาว`,
      ];

      if (posTags.length || negTags.length) {
        reviewLines.push('');
        reviewLines.push('[มาร์กเรื่องสำคัญ]');
        if (posTags.length) reviewLines.push(`• เรื่องดี: ${posTags.join(', ')}`);
        if (negTags.length) reviewLines.push(`• เรื่องแย่: ${negTags.join(', ')}`);
      }

      const detail = `${summaryText}\n\n${reviewLines.join('\n')}`;

      // 4) เตรียม payload ส่งไป backend
      const payload = {
        date: dateISO,
        time: '00:00:00',
        title: `บันทึกของ ${dateHeader}`,
        detail,
        mood: getMoodEmoji(overall),             // emoji หลัก
        mood_score: overall,                     // คะแนนภาพรวม 1–5
        positive_score: posScore || null,        // คะแนนด้านดี
        negative_score: negScore || null,        // คะแนนด้านแย่
        mood_tags: [...toEmojis(posTags), ...toEmojis(negTags)],
        activities: processedActivities,
      };

      await createDiary(payload);
      onClose(true);
    } catch (e) {
      console.log('createDiary error', e);
      Alert.alert('เกิดข้อผิดพลาด', 'บันทึกไม่สำเร็จ');
      onClose(false);
    } finally {
      setLoading(false);
    }
  };

  const StarRow = ({ label, value, setValue, color = '#faad14', large = false, onLayout }) => (
    <View style={[styles.row, large && styles.rowLarge]} onLayout={onLayout}>
      <Text style={[styles.rowLabel, large && styles.rowLabelCenter]}>{label}</Text>
      <View style={[styles.stars, large && styles.starsCenter]}>
        {[1, 2, 3, 4, 5].map((i) => (
          <TouchableOpacity key={i} onPress={() => setValue(i)}>
            <Ionicons
              name={i <= value ? 'star' : 'star-outline'}
              size={large ? 42 : 32}
              color={i <= value ? color : '#e0e0e0'}
            />
          </TouchableOpacity>
        ))}
      </View>
      {large && <Text style={styles.hintText}>ให้คะแนน 1–5 ดาว</Text>}
    </View>
  );

  const TagRow = ({ options, selected, setSelected, activeColor }) => (
    <View style={styles.tagRow}>
      {options.map((tag) => {
        const active = selected.includes(tag);
        return (
          <TouchableOpacity
            key={tag}
            style={[
              styles.tagChip,
              active && { backgroundColor: activeColor + '20', borderColor: activeColor },
            ]}
            onPress={() =>
              setSelected((prev) =>
                active ? prev.filter((t) => t !== tag) : [...prev, tag],
              )
            }
          >
            <Text
              style={[styles.tagText, active && { color: activeColor, fontWeight: '700' }]}
            >
              {tag}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => onClose(false)}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>👋 บันทึกความรู้สึก</Text>
          <Text style={styles.subtitle}>{dateHeader} เป็นอย่างไรบ้าง</Text>

          <ScrollView
            ref={scrollRef}
            style={{ maxHeight: 400 }}
            showsVerticalScrollIndicator={false}
          >
            {/* ด้านดี */}
            <View style={styles.sectionCard}>
              <StarRow
                label="เรื่องดี ๆ"
                value={posScore}
                setValue={setPosScore}
                color="#52c41a"
              />
              {posScore > 0 && (
                <TagRow
                  options={POSITIVE_TAGS}
                  selected={posTags}
                  setSelected={setPosTags}
                  activeColor="#52c41a"
                />
              )}
            </View>

            <View style={styles.divider} />

            {/* ด้านแย่ */}
            <View style={styles.sectionCard}>
              <StarRow
                label="เรื่องแย่ ๆ"
                value={negScore}
                setValue={setNegScore}
                color="#ff4d4f"
              />
              {negScore > 0 && (
                <TagRow
                  options={NEGATIVE_TAGS}
                  selected={negTags}
                  setSelected={setNegTags}
                  activeColor="#ff4d4f"
                />
              )}
            </View>

            <View style={styles.divider} />

            {/* ภาพรวมทั้งวัน */}
            <View
              style={styles.sectionCard}
              onLayout={(e) => setOverallY(e.nativeEvent.layout.y)}
            >
              <StarRow
                label="ภาพรวมทั้งวัน"
                value={overall}
                setValue={setOverall}
                large
              />
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>บันทึก</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnGhost]}
              onPress={() => onClose(false)}
              disabled={loading}
            >
              <Text style={styles.btnGhostText}>ข้ามไปก่อน</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f6f8b',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  row: {
    marginVertical: 10,
  },
  rowLarge: {
    paddingTop: 6,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  rowLabelCenter: {
    textAlign: 'center',
  },
  stars: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  starsCenter: { justifyContent: 'center' },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    justifyContent: 'center',
  },
  tagChip: {
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f9f9f9',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  tagText: {
    color: '#888',
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: '#e6e6e6',
    marginVertical: 15,
  },
  actions: {
    marginTop: 20,
    gap: 10,
  },
  btn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: '#1f6f8b',
  },
  btnGhost: {
    backgroundColor: '#f5f5f5',
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  btnGhostText: {
    color: '#666',
    fontWeight: '600',
  },
  hintText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 12,
    marginTop: 6,
  },
});
