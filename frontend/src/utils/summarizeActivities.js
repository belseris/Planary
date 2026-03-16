import { CATEGORIES } from "./constants";

/**
 * src/summarizeActivities.js
 * Activity Summary Generator
 * 
 * ฟีเจอร์: สร้างข้อความสรุปกิจกรรมอัตโนมัติสำหรับ diary
 * 
 * Use Case:
 * - ผู้ใช้สร้าง diary ใหม่
 * - ระบบดึงกิจกรรมของวันนั้นมาทั้งหมด
 * - สร้างข้อความสรุปเติมใน detail field อัตโนมัติ
 * 
 * ตัวอย่าง Output:
 * ```
 * สรุปกิจกรรมในวันนี้:
 * 
 * ✅ 08:00 - ออกกำลังกาย (เสร็จแล้ว)
 * 🟧 10:00 - ทำงาน Project A (กำลังทำ)
 * ⬜️ 14:00 - ประชุมทีม (ยังไม่เริ่ม)
 * 
 * ความรู้สึกวันนี้: 
 * ```
 */

/**
 * generateActivitySummary - สร้างข้อความสรุปกิจกรรม
 * 
 * @param {Array} activities - รายการกิจกรรมของวันนั้น
 * @returns {string} ข้อความสรุปที่ formatted พร้อม emoji แบบกลุ่มตามสถานะ
 * 
 * Features:
 * - จัดกลุ่มตามสถานะ (Done, In Progress, Pending)
 * - แสดงเวลา, emoji, หมวดหมู่ในวงเล็บ, และชื่อกิจกรรม
 * - แสดงรายละเอียด, ความคืบหน้า, และหมายเหตุ
 */
export function generateActivitySummary(activities) {
  // ถ้าไม่มีกิจกรรม
  if (!activities || activities.length === 0) {
    return 'ไม่มีกิจกรรมในวันนี้';
  }

  // Category emoji mapping (ยึดจาก constants + ส่วนเสริมที่ยังไม่มี)
  const categoryEmojis = CATEGORIES.reduce((acc, item) => {
    acc[item.name] = item.emoji;
    return acc;
  }, {
    'โปรเจกต์': '💻',
    'ความบันเทิง': '🎬',
    'สุขอาหาร': '🍽️',
    'ท่องเที่ยว': '✈️',
  });

  // ฟังก์ชันหา emoji สำหรับ category
  // ถ้าไม่รู้จักหมวด ให้ fallback เป็น 📌
  const getCategoryEmoji = (category) => categoryEmojis[category] || '📌';

  // แปลง status ให้เป็นรูปแบบเดียวกัน
  const normalizeStatus = (status) => {
    if (status === 'done') return 'done';
    if (status === 'in_progress') return 'in_progress';
    if (status === 'pending') return 'pending';
    if (status === 'urgent') return 'in_progress';
    if (status === 'normal') return 'pending';
    return status;
  };

  // จัดเรียงตามเวลา (กิจกรรม "ทั้งวัน" อยู่ท้ายสุด)
  // ใช้ localeCompare เพราะ format เวลาเป็น HH:MM จึงเรียงตัวอักษรได้ตรงเวลา
  const sorted = [...activities].sort((a, b) => {
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });

  // แยกกิจกรรมตาม status - ใช้ 'done', 'in_progress', 'pending'
  const done = sorted.filter(a => normalizeStatus(a.status) === 'done');
  const inProgress = sorted.filter(a => normalizeStatus(a.status) === 'in_progress');
  const pending = sorted.filter(a => normalizeStatus(a.status) === 'pending');

  let summary = '';

  const parseSubtasks = (value) => {
    // รองรับ subtasks ทั้ง 3 รูปแบบ: array ตรง, JSON string, หรือไม่ส่งมา
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return [];
  };

  // ฟังก์ชันสำหรับฟอร์แมตกิจกรรม
  const formatActivity = (act, status) => {
    let text = '';
    
    // Header: เวลา, emoji, หมวดหมู่, ชื่อ
    // ถ้าเป็น all_day หรือไม่มีเวลา ใช้คำว่า "ทั้งวัน"
    // ถ้ามีเวลา ตัดเหลือ HH:MM จาก HH:MM:SS
    const timeStr = act.all_day || !act.time ? 'ทั้งวัน' : act.time.slice(0, 5);
    const emoji = getCategoryEmoji(act.category);
    text += `${timeStr} ${emoji} [${act.category}] : ${act.title}\n`;
    
    // Description  
    const description = act.description || act.detail || '';
    if (description) text += `${description}\n`;
    
    // Subtasks handling
    const subtasks = parseSubtasks(act.subtasks);
    if (subtasks.length > 0) {
      // For in_progress: show progress counter + checkboxes
      if (status === 'in_progress') {
        // ความคืบหน้า = จำนวน subtask ที่เสร็จ / จำนวนทั้งหมด
        const completed = subtasks.filter(s => s.completed || s.is_done || s.done).length;
        const total = subtasks.length;
        text += `ความคืบหน้า: ${completed}/${total}\n`;
        
        subtasks.forEach((subtask) => {
          const label = subtask.title || subtask.text || '';
          if (label) {
            const isDone = subtask.completed || subtask.is_done || subtask.done;
            text += `  ${isDone ? '✓' : '○'} ${label}\n`;
          }
        });
      } 
      // For completed: just list the subtask titles plainly
      else if (status === 'done') {
        subtasks.forEach((subtask) => {
          const label = subtask.title || subtask.text || '';
          if (label) text += `${label}\n`;
        });
      }
      // For pending: show with checkboxes
      else {
        subtasks.forEach((subtask) => {
          const label = subtask.title || subtask.text || '';
          if (label) {
            const isDone = subtask.completed || subtask.is_done || subtask.done;
            text += `  ${isDone ? '✓' : '○'} ${label}\n`;
          }
        });
      }
    }
    
    // Note (only for in_progress and pending)
    const note = act.note || act.notes || '';
    if (note && note !== description) {
      text += `Note: ${note}\n`;
    }
    
    return text;
  };

  // Completed Activities
  // เรียงแสดงตามลำดับ: done -> in_progress -> pending เพื่อให้อ่านภาพรวมง่าย
  if (done.length > 0) {
    summary += '✨ ภารกิจที่สำเร็จ (Completed)\n\n';
    done.forEach((act) => {
      summary += formatActivity(act, 'done');
      summary += '\n';
    });
  }

  // In Progress Activities
  if (inProgress.length > 0) {
    if (done.length > 0) summary += '\n'; // Add spacing between sections
    summary += '🚧 กำลังดำเนินการ (In Progress)\n\n';
    inProgress.forEach((act) => {
      summary += formatActivity(act, 'in_progress');
      summary += '\n';
    });
  }

  // Pending Activities
  if (pending.length > 0) {
    if (done.length > 0 || inProgress.length > 0) summary += '\n'; // Add spacing between sections
    summary += '🛑 ยังไม่ได้เริ่ม (Pending)\n\n';
    pending.forEach((act) => {
      summary += formatActivity(act, 'pending');
      summary += '\n';
    });
  }

  return summary.trim();
}
