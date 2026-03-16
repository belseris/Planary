// frontend/src/utils/dateUtils.js

/**
 * แปลง Date object เป็น string "YYYY-MM-DD"
 * @param {Date} d - The date object
 * @returns {string}
 */
export function toDateString(d = new Date()) {
  // เดือนของ JS เริ่มที่ 0 จึงต้อง +1 ก่อนจัดรูปแบบ
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

/**
 * แปลง Date object เป็น string "HH:MM"
 * @param {Date} d - The date object
 * @returns {string}
 */
export function toTimeString(d = new Date()) {
  // padStart(2) ทำให้เวลาอยู่รูปแบบคงที่ เช่น 9:5 -> 09:05
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}

/**
 * หาวันแรกของสัปดาห์ (วันจันทร์) จากวันที่ที่กำหนด
 * @param {Date} d - The date object
 * @returns {Date}
 */
export function getStartOfWeek(d) {
  // clone วันที่เพื่อไม่แก้ค่าต้นฉบับจากภายนอก
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // คำนวณจำนวนวันที่ต้องย้อนกลับไปหาวันจันทร์
  // ถ้าเป็นวันอาทิตย์ (0) ต้องย้อนกลับ 6 วัน
  // ถ้าเป็นวันจันทร์ (1) ต้องย้อนกลับ 0 วัน
  // ถ้าเป็นวันเสาร์ (6) ต้องย้อนกลับ 5 วัน
  const diff = day === 0 ? -6 : -(day - 1);
  const result = new Date(date);
  // คำนวณวันจันทร์ของสัปดาห์เดียวกันด้วยการเลื่อนจำนวนวันตาม diff
  result.setDate(date.getDate() + diff);
  return result;
}