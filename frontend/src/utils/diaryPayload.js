import { tagEmojiMap } from "../constants/tags";

// ค่า default เวลาเมื่อผู้ใช้ไม่ได้กำหนดเวลาใน diary
export const DEFAULT_DIARY_TIME = "00:00:00";

// แปลงคะแนนอารมณ์ 1-5 -> emoji กลางสำหรับ backend/UI
// 4-5 = ดี, 3 = กลาง, 1-2 = แย่
export const getMoodEmojiForScore = (score) => {
  if (!score) return null;
  if (score >= 4) return "😄";
  if (score === 3) return "😐";
  return "😞";
};

// ทำรูปแบบกิจกรรมให้โครงสร้างคงที่ก่อนส่ง API
// id บังคับเป็น string และเติม activityMood เป็นค่าเริ่มต้นหากไม่มี
export const normalizeActivities = (activities) =>
  (activities || []).map((act) => ({
    id: String(act.id),
    title: act.title,
    status: act.status,
    category: act.category,
    activityMood: act.activityMood || "🙂"
  }));

export const buildDiaryPayload = ({
  date,
  time = DEFAULT_DIARY_TIME,
  title,
  detail,
  positiveScore,
  negativeScore,
  moodScore,
  positiveTags = [],
  negativeTags = [],
  extraMoodTags = [],
  activities
}) => {
  // รวมแท็กฝั่ง positive/negative โดยแปลงชื่อแท็ก -> emoji ผ่าน tagEmojiMap
  // filter(Boolean) ตัดค่าที่ map ไม่เจอออก เพื่อไม่ส่งค่าขยะเข้า API
  const moodTags = [
    ...positiveTags.map((tag) => tagEmojiMap[tag]).filter(Boolean),
    ...negativeTags.map((tag) => tagEmojiMap[tag]).filter(Boolean),
    ...extraMoodTags
  ];

  // trim title/detail กันช่องว่างล้วน และส่งคะแนนที่ไม่มีค่าเป็น null
  // เพื่อให้ backend แยกได้ว่า "ไม่กรอก" ไม่ใช่ค่า 0
  const payload = {
    date,
    time,
    title: (title || "").trim(),
    detail: (detail || "").trim(),
    positive_score: positiveScore || null,
    negative_score: negativeScore || null,
    mood_score: moodScore || null,
    mood_tags: moodTags
  };

  const mood = getMoodEmojiForScore(moodScore);
  if (mood) {
    // เพิ่มฟิลด์ mood เมื่อคำนวณได้เท่านั้น
    payload.mood = mood;
  }

  if (activities !== undefined) {
    // อนุญาตส่ง activities เฉพาะเคสที่ caller ต้องการแนบ
    payload.activities = activities;
  }

  return payload;
};
