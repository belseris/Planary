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
  Dimensions,
  Platform,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { listActivities, createDiary } from '../api';
import { generateActivitySummary } from '../utils/summarizeActivities';
import { POSITIVE_GROUPS, NEGATIVE_GROUPS } from '../constants/tags';
import { buildDiaryPayload, normalizeActivities } from '../utils/diaryPayload';

// --- Helper Components ---
const SectionHeader = ({ icon, title, color }) => (
  <View style={styles.sectionHeader}>
    <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={18} color={color} />
    </View>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

const GroupTitle = ({ title, color }) => (
  <Text style={[styles.groupTitle, { color: color }]}>{title}</Text>
);

const TagChip = ({ item, active, onPress, activeColor }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    style={[
      styles.tagChip,
      active 
        ? { backgroundColor: activeColor, borderColor: activeColor, elevation: 2 } 
        : { backgroundColor: '#FFF', borderColor: '#F0F0F0', borderWidth: 1 }
    ]}
  >
    <Text style={styles.tagEmoji}>{item.emoji}</Text>
    <Text style={[styles.tagText, active ? styles.textWhite : { color: '#666' }]}>
      {item.label}
    </Text>
  </TouchableOpacity>
);

export default function YesterdayDiaryModal({ visible, onClose, dateISO }) {
  // คะแนน 3 ส่วน: positive / negative / overall (ให้ผู้ใช้ประเมินคนละมิติ)
  const [posScore, setPosScore] = useState(0);
  const [negScore, setNegScore] = useState(0);
  const [overall, setOverall] = useState(0);
  
  const [selectedPosTags, setSelectedPosTags] = useState([]);
  const [selectedNegTags, setSelectedNegTags] = useState([]);
  
  const [personalNote, setPersonalNote] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [tempNote, setTempNote] = useState('');
  
  const [previewActivities, setPreviewActivities] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (visible) {
      // รีเซ็ต state ทุกครั้งที่เปิด modal เพื่อไม่ให้ข้อมูลครั้งก่อนค้าง
      setPosScore(0); setNegScore(0); setOverall(0);
      setSelectedPosTags([]); setSelectedNegTags([]);
      setPersonalNote('');
      setTempNote('');
      setShowNoteModal(false);
      setLoading(false);
      
      // ดึงกิจกรรมของวันที่ต้องการ
      (async () => {
        try {
          const actsResp = await listActivities({ qdate: dateISO });
          const activities = actsResp?.items || [];
          // map เฉพาะ field ที่ใช้ preview ใน modal เพื่อลดข้อมูลที่ต้องถือไว้
          const processed = activities.map((act) => ({
            id: String(act.id),
            title: act.title,
            status: act.status,
            category: act.category,
            time: act.time,
          }));
          setPreviewActivities(processed);
        } catch (err) {
          console.error('Error fetching activities:', err);
          setPreviewActivities([]);
        }
      })();
    }
  }, [visible, dateISO]);

  const dateHeader = useMemo(() => {
    try {
      // แปลงวันที่เป็นรูปแบบไทยสำหรับแสดงหัวข้อ
      const d = new Date(dateISO);
      return `วันที่ ${d.getDate()} ${d.toLocaleString('th-TH', { month: 'long' })}`;
    } catch { return dateISO; }
  }, [dateISO]);

  const handleToggleTag = (item, list, setList) => {
    const exists = list.find(t => t.label === item.label);
    if (exists) {
        setList(list.filter(t => t.label !== item.label));
    } else {
        setList([...list, item]);
    }
  };

  const handleSave = async () => {
    // บังคับให้มีคะแนนรวมก่อนบันทึก เพื่อไม่ให้ diary ขาดข้อมูลหลัก
    if (!overall) {
        Alert.alert('ลืมให้ดาว', 'ช่วยประเมินภาพรวมของวันหน่อยครับ 🥺');
        return;
    }
    setLoading(true);
    try {
      const actsResp = await listActivities({ qdate: dateISO });
      const activities = actsResp?.items || [];
      // สรุปกิจกรรมอัตโนมัติ + บันทึกส่วนตัว แล้วรวมเป็น detail เดียว
      const summaryText = generateActivitySummary(activities);
      const noteText = personalNote.trim();
      const detailText = [summaryText, noteText].filter(Boolean).join("\n\n");

      // normalize ข้อมูลกิจกรรมให้รูปแบบคงที่ก่อนส่งเข้า payload
      const processedActivities = normalizeActivities(activities);

      // buildDiaryPayload รวม score/tags/detail/activities ให้ตรง schema backend
      const payload = buildDiaryPayload({
        date: dateISO,
        title: `บันทึกย้อนหลัง: ${dateHeader}`,
        detail: detailText,
        positiveScore: posScore,
        negativeScore: negScore,
        moodScore: overall,
        positiveTags: selectedPosTags.map((t) => t.label),
        negativeTags: selectedNegTags.map((t) => t.label),
        activities: processedActivities
      });

      await createDiary(payload);
      onClose(true);
    } catch (e) {
      Alert.alert('Error', 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้งนะ');
    } finally {
      setLoading(false);
    }
  };

  const StarSelector = ({ value, onChange, color, size = 32, center=true }) => (
    <View style={[styles.starContainer, center && {justifyContent: 'center'}]}>
      {[1, 2, 3, 4, 5].map((i) => (
        <TouchableOpacity key={i} onPress={() => onChange(i)} activeOpacity={0.5}>
          <Ionicons
            name={i <= value ? 'star' : 'star-outline'}
            size={size}
            color={i <= value ? color : '#E0E0E0'}
            style={{ marginHorizontal: 4 }}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => onClose(false)}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>ย้อนเวลา ⏳</Text>
              <Text style={styles.headerDate}>{dateHeader} เป็นไงบ้าง?</Text>
            </View>
            <TouchableOpacity onPress={() => onClose(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#888" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            ref={scrollRef} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {/* 1. Overall Section (ย้ายมาไว้บนสุด) */}
            <View style={[styles.sectionBox, styles.bgBlue, styles.elevationHigh]}>
              <Text style={styles.overallTitle}>สรุปภาพรวมทั้งวัน</Text>
              <Text style={styles.overallSub}>ให้คะแนนความสุขของคุณหน่อย</Text>
              <View style={{ marginTop: 12 }}>
                 <StarSelector value={overall} onChange={setOverall} color="#faad14" size={48} />
              </View>
            </View>

            {/* 2. Positive Section */}
            <View style={[styles.sectionBox, styles.bgGreen]}>
              <SectionHeader icon="happy" title="เรื่องราวดีๆ" color="#389e0d" />
              <StarSelector value={posScore} onChange={setPosScore} color="#52c41a" />
              
              {posScore > 0 && POSITIVE_GROUPS.map((group, idx) => (
                <View key={idx} style={styles.groupContainer}>
                  <GroupTitle title={group.title} color="#5b8c00" />
                  <View style={styles.gridContainer}>
                    {group.data.map((item, i) => (
                      <TagChip 
                        key={i} item={item}
                        active={selectedPosTags.some(t => t.label === item.label)} 
                        activeColor="#73d13d"
                        onPress={() => handleToggleTag(item, selectedPosTags, setSelectedPosTags)} 
                      />
                    ))}
                  </View>
                </View>
              ))}
              {posScore === 0 && <Text style={styles.emptyHint}>กดดาวเพื่อเลือกเรื่องดีๆ</Text>}
            </View>

            {/* 3. Negative Section */}
            <View style={[styles.sectionBox, styles.bgRed]}>
              <SectionHeader icon="sad" title="เรื่องที่กวนใจ" color="#cf1322" />
              <StarSelector value={negScore} onChange={setNegScore} color="#ff4d4f" />
              
              {negScore > 0 && NEGATIVE_GROUPS.map((group, idx) => (
                <View key={idx} style={styles.groupContainer}>
                  <GroupTitle title={group.title} color="#cf1322" />
                  <View style={styles.gridContainer}>
                    {group.data.map((item, i) => (
                      <TagChip 
                        key={i} item={item}
                        active={selectedNegTags.some(t => t.label === item.label)} 
                        activeColor="#ff7875"
                        onPress={() => handleToggleTag(item, selectedNegTags, setSelectedNegTags)} 
                      />
                    ))}
                  </View>
                </View>
              ))}
              {negScore === 0 && <Text style={styles.emptyHint}>กดดาวเพื่อระบายเรื่องแย่ๆ</Text>}
            </View>

            {/* 4. Personal Note Section */}
            <View style={[styles.sectionBox, { backgroundColor: '#fafafa' }]}>
              <SectionHeader icon="document-text" title="💭 คิดอะไรในวันนั้น" color="#1f6f8b" />
              <Text style={styles.noteSubtitle}>เขียนสั้นๆ ว่าคิดหรือรู้สึกอะไรกับวันนี้...</Text>
              <TouchableOpacity 
                style={styles.editNoteBtn}
                onPress={() => {
                  setTempNote(personalNote);
                  setShowNoteModal(true);
                }}
              >
                <Ionicons name={personalNote.trim() ? "pencil" : "create"} size={16} color="#1f6f8b" style={{ marginRight: 6 }} />
                <Text style={styles.editNoteBtnText}>
                  {personalNote.trim() ? `✏️ "${personalNote.substring(0, 30)}${personalNote.length > 30 ? '...' : ''}"` : 'เขียนเลย'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 5. Preview & Quick Score Section */}
            {overall > 0 && (
              <View style={[styles.sectionBox, styles.previewBox]}>
                <Text style={styles.scorePreviewTitle}>📊 ตัวอย่างการบันทึก</Text>
                
                {/* Overall Mood Display */}
                <View style={styles.moodPreviewRow}>
                  <View style={styles.moodCircle}>
                    <Text style={styles.moodEmoji}>
                      {overall >= 4 ? '😄' : overall === 3 ? '😐' : '😞'}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.moodLabel}>ภาพรวมวันนี้</Text>
                    <View style={styles.scoreStars}>
                      {[1, 2, 3, 4, 5].map(i => (
                        <Ionicons 
                          key={i}
                          name={i <= overall ? 'star' : 'star-outline'}
                          size={14}
                          color="#faad14"
                          style={{ marginRight: 2 }}
                        />
                      ))}
                      <Text style={styles.scoreText}>{overall}/5</Text>
                    </View>
                  </View>
                </View>

                {/* Selected Tags Summary */}
                {(selectedPosTags.length > 0 || selectedNegTags.length > 0) && (
                  <View style={styles.selectedTagsPreview}>
                    {selectedPosTags.length > 0 && (
                      <View style={styles.previewTagGroup}>
                        <Text style={styles.previewTagLabel}>🟢 เรื่องดี:</Text>
                        <View style={styles.previewTags}>
                          {selectedPosTags.map((tag, i) => (
                            <View key={i} style={styles.previewTagBadge}>
                              <Text style={styles.previewTagEmoji}>{tag.emoji}</Text>
                              <Text style={styles.previewTagText}>{tag.label}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                    
                    {selectedNegTags.length > 0 && (
                      <View style={styles.previewTagGroup}>
                        <Text style={styles.previewTagLabel}>🔴 เรื่องแย่:</Text>
                        <View style={styles.previewTags}>
                          {selectedNegTags.map((tag, i) => (
                            <View key={i} style={styles.previewTagBadge}>
                              <Text style={styles.previewTagEmoji}>{tag.emoji}</Text>
                              <Text style={styles.previewTagText}>{tag.label}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* Personal Note Preview */}
                {personalNote.trim() && (
                  <View style={styles.notePreview}>
                    <Text style={styles.notePreviewLabel}>💭 ความคิด:</Text>
                    <Text style={styles.notePreviewText}>"{personalNote.trim()}"</Text>
                  </View>
                )}

                {/* Activity Breakdown */}
                {previewActivities && previewActivities.length > 0 && (
                  <View style={styles.activitiesBreakdown}>
                    <Text style={styles.activitiesBreakdownTitle}>📋 ภารกิจในวัน</Text>

                    {/* Completed Activities */}
                    {previewActivities.filter(a => a.status === 'done').length > 0 && (
                      <View style={styles.activityGroup}>
                        <Text style={styles.activityGroupTitle}>✨ ภารกิจที่สำเร็จ (Completed)</Text>
                        {previewActivities.filter(a => a.status === 'done').map((act, idx) => (
                          <View key={idx} style={styles.activityItemCard}>
                            <View style={styles.activityItemHeader}>
                              <Text style={styles.activityItemStatus}>✅</Text>
                              <Text style={styles.activityItemTime}>{act.time || 'ตลอดวัน'}</Text>
                              <Text style={styles.activityItemCategory}>{act.category}</Text>
                              <Text style={styles.activityItemTitle}>{act.title}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* In Progress Activities */}
                    {previewActivities.filter(a => a.status === 'in_progress').length > 0 && (
                      <View style={styles.activityGroup}>
                        <Text style={styles.activityGroupTitle}>🚧 กำลังดำเนินการ (In Progress)</Text>
                        {previewActivities.filter(a => a.status === 'in_progress').map((act, idx) => (
                          <View key={idx} style={styles.activityItemCard}>
                            <View style={styles.activityItemHeader}>
                              <Text style={styles.activityItemStatus}>🔄</Text>
                              <Text style={styles.activityItemTime}>{act.time || 'ตลอดวัน'}</Text>
                              <Text style={styles.activityItemCategory}>{act.category}</Text>
                              <Text style={styles.activityItemTitle}>{act.title}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Pending Activities */}
                    {previewActivities.filter(a => a.status === 'pending').length > 0 && (
                      <View style={styles.activityGroup}>
                        <Text style={styles.activityGroupTitle}>🛑 ยังไม่ได้เริ่ม (Pending)</Text>
                        {previewActivities.filter(a => a.status === 'pending').map((act, idx) => (
                          <View key={idx} style={styles.activityItemCard}>
                            <View style={styles.activityItemHeader}>
                              <Text style={styles.activityItemStatus}>⏳</Text>
                              <Text style={styles.activityItemTime}>{act.time || 'ตลอดวัน'}</Text>
                              <Text style={styles.activityItemCategory}>{act.category}</Text>
                              <Text style={styles.activityItemTitle}>{act.title}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Footer Save Button */}
          <View style={styles.footer}>
             <TouchableOpacity 
                style={[styles.saveBtn, !overall && styles.saveBtnDisabled]} 
                onPress={handleSave}
                disabled={!overall || loading}
            >
                {loading ? <ActivityIndicator color="#fff" /> : (
                    <Text style={styles.saveBtnText}>บันทึกความทรงจำ</Text>
                )}
             </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Note Editing Modal */}
      <Modal 
        visible={showNoteModal} 
        transparent 
        animationType="fade"
        onRequestClose={() => setShowNoteModal(false)}
      >
        <View style={styles.noteModalBackdrop}>
          <View style={styles.noteModalContainer}>
            <View style={styles.noteModalHeader}>
              <Text style={styles.noteModalTitle}>เขียนความคิด</Text>
              <TouchableOpacity 
                onPress={() => setShowNoteModal(false)}
                style={styles.noteModalClose}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.noteTextInput}
              placeholder="บอกเรื่องราวของวันนี้สั้นๆ..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              value={tempNote}
              onChangeText={setTempNote}
              maxLength={500}
            />

            <Text style={styles.noteCharCount}>{tempNote.length}/500</Text>

            <View style={styles.noteModalActions}>
              <TouchableOpacity 
                style={[styles.noteModalBtn, styles.noteModalBtnCancel]}
                onPress={() => setShowNoteModal(false)}
              >
                <Text style={styles.noteModalBtnCancelText}>ยกเลิก</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.noteModalBtn, styles.noteModalBtnSave]}
                onPress={() => {
                  setPersonalNote(tempNote);
                  setShowNoteModal(false);
                }}
              >
                <Text style={styles.noteModalBtnSaveText}>บันทึก</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { 
      backgroundColor: '#F9FAFB', // ปรับสีพื้นหลังให้อ่อนนวลๆ
      borderTopLeftRadius: 28, 
      borderTopRightRadius: 28, 
      height: '92%', 
      paddingHorizontal: 20, 
      paddingTop: 24 
  },
  
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1f6f8b' }, // หัวข้อใหญ่ขึ้นนิดนึง
  headerDate: { fontSize: 14, color: '#666', marginTop: 2 },
  closeBtn: { padding: 8, backgroundColor: '#fff', borderRadius: 20 },

  // Sections
  sectionBox: { 
      borderRadius: 20, 
      padding: 16, 
      marginBottom: 16, 
      borderWidth: 1, 
      borderColor: 'transparent' 
  },
  
  // Overall Section (High priority styling)
  bgBlue: { 
      backgroundColor: '#fff', 
      borderColor: '#E6F7FF', 
      alignItems: 'center', 
      paddingVertical: 24,
      marginTop: 4 // ขยับลงมาจาก Header นิดนึงให้ไม่ชิดเกิน
  },
  elevationHigh: { 
      shadowColor: "#1f6f8b",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 4,
  },
  overallTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f6f8b', marginBottom: 4 },
  overallSub: { fontSize: 14, color: '#888' },

  // Positive/Negative Sections
  bgGreen: { backgroundColor: '#F0F9EB', borderColor: '#D9F7BE' },
  bgRed: { backgroundColor: '#FFF2F0', borderColor: '#FFCCC7' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#333' },
  starContainer: { flexDirection: 'row', marginBottom: 8 },

  emptyHint: { textAlign: 'center', color: '#aaa', fontSize: 12, marginTop: 8, fontStyle: 'italic' },

  // Group & Tags
  groupContainer: { marginTop: 12, marginBottom: 4 },
  groupTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginLeft: 4, opacity: 0.8 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, marginBottom: 0 },
  tagEmoji: { fontSize: 15, marginRight: 6 },
  tagText: { fontSize: 13, fontWeight: '500' },
  textWhite: { color: '#FFF', fontWeight: '700' },

  // Note Input Section
  noteSubtitle: { fontSize: 12, color: '#888', marginBottom: 10, fontStyle: 'italic' },
  editNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F4F8',
    paddingVertical: 10,
    borderRadius: 10
  },
  editNoteBtnText: { color: '#1f6f8b', fontWeight: '600', fontSize: 13 },

  // Preview Section
  previewBox: { 
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed'
  },
  scorePreviewTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#1f6f8b', 
    marginBottom: 12 
  },
  moodPreviewRow: { 
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12
  },
  moodCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#faad14'
  },
  moodEmoji: { fontSize: 28 },
  moodLabel: { fontSize: 12, color: '#666', fontWeight: '500' },
  scoreStars: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  scoreText: { fontSize: 13, fontWeight: '700', color: '#333', marginLeft: 4 },

  // Selected Tags Preview
  selectedTagsPreview: { 
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12
  },
  previewTagGroup: { marginBottom: 10 },
  previewTagLabel: { fontSize: 12, fontWeight: '700', color: '#333', marginBottom: 6 },
  previewTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  previewTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  previewTagEmoji: { fontSize: 14, marginRight: 4 },
  previewTagText: { fontSize: 11, color: '#555', fontWeight: '500' },

  // Note Preview
  notePreview: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#1f6f8b'
  },
  notePreviewLabel: { fontSize: 12, fontWeight: '700', color: '#333', marginBottom: 6 },
  notePreviewText: { fontSize: 12, color: '#666', lineHeight: 18, fontStyle: 'italic' },

  // Note Modal Styles
  noteModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  noteModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  noteModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  noteModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f6f8b',
  },
  noteModalClose: {
    padding: 8,
  },
  noteTextInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#333',
    textAlignVertical: 'top',
    marginBottom: 8,
    minHeight: 100,
  },
  noteCharCount: {
    fontSize: 11,
    color: '#999',
    textAlign: 'right',
    marginBottom: 12,
  },
  noteModalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  noteModalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  noteModalBtnCancel: {
    backgroundColor: '#f0f0f0',
  },
  noteModalBtnCancelText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  noteModalBtnSave: {
    backgroundColor: '#1f6f8b',
  },
  noteModalBtnSaveText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  // Activity Breakdown Styles
  activitiesBreakdown: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  activitiesBreakdownTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f6f8b',
    marginBottom: 12,
  },
  activityGroup: {
    marginBottom: 12,
  },
  activityGroupTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityItemCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#1f6f8b',
  },
  activityItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activityItemStatus: {
    fontSize: 14,
  },
  activityItemTime: {
    fontSize: 10,
    color: '#999',
    fontWeight: '500',
  },
  activityItemCategory: {
    fontSize: 10,
    backgroundColor: '#E8F4F8',
    color: '#1f6f8b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },
  activityItemTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  
  // Footer
  footer: { marginTop: 'auto', paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 30 : 20 },
  saveBtn: { backgroundColor: '#1f6f8b', borderRadius: 18, paddingVertical: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  saveBtnDisabled: { backgroundColor: '#CFD8DC', shadowOpacity: 0, elevation: 0 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});