// src/moodSystem.js

/**
 * ระบบ 2D Mood Tracking
 * มิติที่ 1: ภาพรวม (Good Day / Bad Day)
 * มิติที่ 2: สาเหตุ (Emoji Tags)
 */

export const MOOD_CATEGORIES = {
  good: {
    label: 'วันที่ดี',
    emoji: '👍',
    tags: [
      { emoji: '😊', label: 'สุขสมหวัง' },
      { emoji: '🚀', label: 'มีประสิทธิผล' },
      { emoji: '💪', label: 'แข็งแรง' },
      { emoji: '🙏', label: 'ขอบคุณ' },
      { emoji: '😄', label: 'ปลื้มใจ' },
      { emoji: '🌟', label: 'ยอดเยี่ยม' },
    ],
  },
  bad: {
    label: 'วันที่ไม่ดี',
    emoji: '👎',
    tags: [
      { emoji: '😫', label: 'เครียด' },
      { emoji: '😴', label: 'เหนื่อย' },
      { emoji: '😟', label: 'กังวล' },
      { emoji: '😡', label: 'โกรธ' },
      { emoji: '😢', label: 'เศร้า' },
      { emoji: '😵', label: 'สับสน' },
    ],
  },
};

/**
 * สำหรับเก็บใน DB: 
 * mood_score: 'good' | 'bad' | null
 * mood_tags: ['😊', '🚀'] เป็นต้น
 */

export function getMoodTagsForScore(moodScore) {
  if (moodScore === 'good') return MOOD_CATEGORIES.good.tags;
  if (moodScore === 'bad') return MOOD_CATEGORIES.bad.tags;
  return [];
}
