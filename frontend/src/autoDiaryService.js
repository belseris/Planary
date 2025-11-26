/**
 * src/autoDiaryService.js
 * Auto-Diary Creation Service
 * 
 * ฟีเจอร์: สร้าง diary draft อัตโนมัติสำหรับวันก่อนหน้า
 * 
 * Use Case:
 * - ผู้ใช้เปิดแอปวันนี้ (14 พ.ย.)
 * - ระบบตรวจสอบว่ามี diary สำหรับเมื่อวาน (13 พ.ย.) หรือยัง
 * - ถ้าไม่มี → สร้าง draft ให้อัตโนมัติ (title ว่าง, ไม่มี mood)
 * - ผู้ใช้สามารถกรอกข้อมูลย้อนหลังได้ทีหลัง
 */

import { createDiary, listDiaries, listActivities, meApi } from './api';
import { generateActivitySummary } from './summarizeActivities';

/**
 * ensurePreviousDayDiary - ตรวจสอบและสร้าง diary draft ของวันก่อนหน้า (ย้อนหลัง 7 วัน)
 * 
 * Logic:
 * 1. คำนวณย้อนหลัง 7 วัน
 * 2. เรียก API ดูว่าวันไหนยังไม่มี diary
 * 3. ถ้าไม่มี → สร้าง draft (title=วันที่, detail=สรุปกิจกรรม)
 * 4. ถ้ามีแล้ว → ข้าม
 * 
 * @returns {Promise<Array>} array ของ diary objects ที่สร้างใหม่
 */
export async function ensurePreviousDayDiary() {
  try {
    // Quick auth check: ensure token is valid before attempting API calls
    try {
      await meApi();
    } catch (authErr) {
      console.warn('[Auto-Diary] skipping auto-diary: not authenticated', authErr?.response?.data || authErr?.message || authErr);
      return null;
    }
    
    const today = new Date();
    const createdDiaries = [];
    
    // วนลูปย้อนหลัง 7 วัน
    for (let daysAgo = 1; daysAgo <= 7; daysAgo++) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() - daysAgo);
      const dateStr = targetDate.toISOString().slice(0, 10); // YYYY-MM-DD

      // 2. เรียก API ตรวจสอบว่ามี diary ของวันนั้นหรือยัง
      const diaries = await listDiaries({
        startDate: dateStr,
        endDate: dateStr,
      });

      // 3. ถ้าไม่มี diary = สร้าง Draft ใหม่
      if (!diaries || diaries.length === 0) {
        console.log(`[Auto-Diary] Creating draft for ${dateStr}`);

        // ดึงกิจกรรมของวันก่อนหน้าเพื่อนำมาสร้างสรุปอัตโนมัติ
        let activities = [];
        try {
          const actsResp = await listActivities({ qdate: dateStr });
        activities = actsResp?.items || actsResp || [];
      } catch (e) {
        console.warn('[Auto-Diary] failed to load activities for summary', e);
      }

      // สร้าง summary text และใช้เป็น detail ของ draft
      // Ensure activities include required fields expected by backend
      const processedActivities = (activities || []).map(act => ({
        ...act,
        rating: act.rating ?? 0,
        activityMood: act.activityMood ?? '🙂',
      }));

        const summary = generateActivitySummary(processedActivities);

        // ตั้ง title เป็นวันที่ (รูปแบบไทย)
        const titleForDraft = targetDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

        // Pick a non-null mood value to satisfy DB constraint (backend expects non-null)
        const defaultMood = (processedActivities[0] && processedActivities[0].activityMood) || '🙂';

        const draftPayload = {
          date: dateStr,
        time: '00:00:00',
        title: titleForDraft,
        detail: summary,
        mood: defaultMood,
        mood_score: null,
        mood_tags: [],
        activities: processedActivities.length ? processedActivities : [],
      };

        const newDiary = await createDiary(draftPayload);
        console.log(`[Auto-Diary] Draft created:`, newDiary);
        createdDiaries.push(newDiary);
      } else {
        // 4. ถ้ามีแล้ว = ไม่ต้องทำอะไร
        console.log(`[Auto-Diary] ${dateStr} already has diary, skip`);
      }
    }
    
    return createdDiaries;
  } catch (err) {
    // ไม่ throw error เพราะเป็น background task (ไม่ควรขัดขวางการใช้งานแอป)
    console.warn(`[Auto-Diary] Failed to ensure previous day diary:`, err);
  }
}

/**
 * initAutoDiary - Entry point สำหรับเรียกจาก App.js
 * 
 * เรียกครั้งเดียวเมื่อผู้ใช้เปิดแอป (หลัง login)
 */
export async function initAutoDiary() {
  await ensurePreviousDayDiary();
}
