// src/autoDiaryService.js
import { createDiary, listDiaries } from './diary';

/**
 * ตรวจสอบว่าวันก่อนหน้านี้มี Diary หรือไม่
 * ถ้าไม่มี จะสร้าง Draft ให้อัตโนมัติ
 */
export async function ensurePreviousDayDiary() {
  try {
    // หาวันก่อนหน้า
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    // ตรวจสอบว่า yesterday มี diary หรือไม่
    const diaries = await listDiaries({
      startDate: yesterdayStr,
      endDate: yesterdayStr,
    });

    // ถ้าไม่มี = สร้าง Draft ใหม่
    if (!diaries || diaries.length === 0) {
      console.log(`[Auto-Diary] Creating draft for ${yesterdayStr}`);
      
      const draftPayload = {
        date: yesterdayStr,
        time: '00:00:00',
        title: '', // ว่าง
        detail: null,
        mood: null,
        tags: null,
        activities: null,
      };

      const newDiary = await createDiary(draftPayload);
      console.log(`[Auto-Diary] Draft created:`, newDiary);
      return newDiary;
    }

    console.log(`[Auto-Diary] ${yesterdayStr} already has diary, skip`);
    return null;
  } catch (err) {
    console.warn(`[Auto-Diary] Failed to ensure previous day diary:`, err);
    // ไม่ throw error เพราะเป็น background task
  }
}

/**
 * ทุกครั้งที่เปิดแอป ลองสร้าง draft สำหรับเมื่อวาน
 * เรียก function นี้จาก App.js หลังเข้า main screen
 */
export async function initAutoDiary() {
  await ensurePreviousDayDiary();
}
