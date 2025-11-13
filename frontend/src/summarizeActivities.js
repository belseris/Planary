// src/summarizeActivities.js

/**
 * แปลงกิจกรรมเป็นข้อความสรุปอัตโนมัติ
 * @param {Array} activities - รายการกิจกรรมของวันนั้น
 * @returns {string} ข้อความสรุปที่ formatted
 */
export function generateActivitySummary(activities) {
  if (!activities || activities.length === 0) {
    return 'ไม่มีกิจกรรมในวันนี้';
  }

  // แปลง status เป็น emoji
  const statusEmoji = {
    completed: '✅',
    in_progress: '🟧',
    pending: '⬜️',
  };

  // จัดเรียงตามเวลา (ถ้ามี time ไม่เป็น null)
  const sorted = [...activities].sort((a, b) => {
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });

  // สร้าง summary text
  let summary = 'สรุปกิจกรรมในวันนี้:\n\n';

  sorted.forEach((act) => {
    const emoji = statusEmoji[act.status] || '⭕️';
    const timeStr = act.time ? `${act.time.slice(0, 5)} - ` : '(ทั้งวัน) - ';
    const statusLabel = {
      completed: '(เสร็จแล้ว)',
      in_progress: '(กำลังทำ)',
      pending: '(ยังไม่เริ่ม)',
    }[act.status] || '';

    summary += `${emoji} ${timeStr}${act.title} ${statusLabel}\n`;
  });

  summary += '\nความรู้สึกวันนี้: ';

  return summary;
}
