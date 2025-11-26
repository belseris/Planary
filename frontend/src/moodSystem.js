/**
 * src/moodSystem.js
 * 2D Mood Tracking System
 *
 * แนวคิด:
 * - มิติที่ 1: คะแนน 1..5 (quantitative rating)
 * - มิติที่ 2: Emoji tags (reasons / feelings)
 *
 * Helpers exported:
 * - MOOD_CATEGORIES, NEUTRAL_TAGS
 * - getMoodTagsForScore (legacy)
 * - getTagsForRating (1..5 -> tag groups)
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
      { emoji: '😣', label: 'ท้อ' },
      { emoji: '😤', label: 'หงุดหงิด' },
    ],
  },
};

// Neutral tags suitable for a 3-star rating
export const NEUTRAL_TAGS = [
  { emoji: '😐', label: 'เฉยๆ' },
  { emoji: '🤔', label: 'คิดมาก' },
  { emoji: '🤷‍♂️', label: 'ไม่แน่ใจ' },
  { emoji: '🤯', label: 'ยุ่ง' },
];

/**
 * getMoodTagsForScore - ดึง emoji tags ตาม mood score (legacy helper)
 */
export function getMoodTagsForScore(moodScore) {
  if (moodScore === 'good') return MOOD_CATEGORIES.good.tags;
  if (moodScore === 'bad') return MOOD_CATEGORIES.bad.tags;
  return [];
}

/**
 * getTagsForRating - ดึงชุดแท็กตามคะแนนดาว (1-5)
 * - 1-2: กลุ่มลบ
 * - 3: กลุ่มกลาง
 * - 4-5: กลุ่มบวก
 */
export function getTagsForRating(rating) {
  if (rating === 3) return NEUTRAL_TAGS;
  if (rating >= 4) return MOOD_CATEGORIES.good.tags;
  if (rating >= 1 && rating <= 2) return MOOD_CATEGORIES.bad.tags;
  return [];
}

