// frontend/src/utils/dateUtils.js

/**
 * แปลง Date object เป็น string "YYYY-MM-DD"
 * @param {Date} d - The date object
 * @returns {string}
 */
export function toDateString(d = new Date()) {
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
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}

/**
 * หาวันแรกของสัปดาห์ (วันอาทิตย์) จากวันที่ที่กำหนด
 * @param {Date} d - The date object
 * @returns {Date}
 */
export function getStartOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, ...
  const diff = date.getDate() - day; // คำนวณหาวันอาทิตย์
  return new Date(date.setDate(diff));
}