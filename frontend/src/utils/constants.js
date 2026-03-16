// utils/constants.js

// ไฟล์นี้เป็น "แหล่งค่ากลาง" ของแอป (single source of truth)
// หน้าต่างๆ ควร import จากไฟล์นี้แทนการ hardcode ซ้ำในแต่ละจุด

// 1. หมวดหมู่ (CATEGORIES) - 20 หมวด
// โครงสร้างแต่ละ item: name = key ที่ระบบใช้, label = ข้อความแสดงผล, emoji = icon ประจำหมวด
export const CATEGORIES = [
  { name: "เรียน", emoji: "📚", label: "เรียน" },
  { name: "ทำงาน", emoji: "💼", label: "ทำงาน" },
  { name: "ออกกำลังกาย", emoji: "🏋️", label: "ออกกำลังกาย" },
  { name: "เรื่องบ้าน", emoji: "🏠", label: "เรื่องบ้าน" },
  { name: "ส่วนตัว", emoji: "👤", label: "ส่วนตัว" },
  { name: "สุขภาพ", emoji: "🏥", label: "สุขภาพ" },
  { name: "สังคม", emoji: "👥", label: "สังคม" },
  { name: "งานอดิเรก", emoji: "🎨", label: "งานอดิเรก" },
  { name: "study", emoji: "📚", label: "study" },
  { name: "work", emoji: "💼", label: "work" },
  { name: "health", emoji: "🏥", label: "health" },
  { name: "personal", emoji: "👤", label: "personal" },
  { name: "social", emoji: "👥", label: "social" },
  { name: "hobby", emoji: "🎨", label: "hobby" },
  { name: "other", emoji: "📌", label: "other" },
  { name: "อื่นๆ", emoji: "📌", label: "อื่นๆ" },
];

// 2. ระดับความสำคัญ (PRIORITIES) - 2 ตัวเลือก
// key ต้องตรงกับค่าที่ backend รองรับ
export const PRIORITIES = [
  { key: "medium", label: "ปกติ", emoji: "🟡", color: "#faad14" },
  { key: "high", label: "ด่วน", emoji: "🔴", color: "#ff4d4f" },
];

// 3. ตัวเลือกแจ้งเตือน (REMINDER_OPTIONS) - เป็นนาที
// value = จำนวนนาทีก่อนเวลาเริ่มกิจกรรม (เช่น 60 = แจ้งก่อน 1 ชั่วโมง)
// ค่า -1 ใช้เป็น sentinel สำหรับกรอกเวลาเอง
export const REMINDER_OPTIONS = [
  { value: 0, label: "ไม่มีการแจ้งเตือน" },
  { value: 5, label: "5 นาทีก่อน" },
  { value: 10, label: "10 นาทีก่อน" },
  { value: 15, label: "15 นาทีก่อน" },
  { value: 30, label: "30 นาทีก่อน" },
  { value: 60, label: "1 ชั่วโมงก่อน" },
  { value: 1440, label: "1 วันก่อน" },
  { value: -1, label: "ระบุเอง..." },
];

// 4. สถานะ (STATUSES) - เป็นแหล่งข้อมูลเดียว (ตรงกับ Backend)
// key (pending/in_progress/done) คือค่าธุรกิจที่ใช้ตัดสินใจใน logic
// ส่วน label/backgroundColor/color เป็นค่าที่ใช้ render UI
export const STATUSES = {
  pending:     { label: 'ยังไม่เริ่ม',   backgroundColor: '#fff1f0', color: '#FF3B30' },
  in_progress: { label: 'กำลังทำ',      backgroundColor: '#fffbe6', color: '#FFCC00' },
  done:        { label: 'เสร็จแล้ว',    backgroundColor: '#f6ffed', color: '#34C759' },
};

// 3. ตัวเลือกสถานะสำหรับ Dropdown/Menu
// แปลงจาก object -> array เพื่อใช้ง่ายกับ picker/menu component
export const STATUS_OPTIONS = Object.entries(STATUSES).map(([key, value]) => ({
    key,
    label: value.label
}));

// 4. วันในสัปดาห์
// TH_DAYS: แบบย่อเรียงตาม index ของ JS Date.getDay() (อา=0 ... ส=6)
export const TH_DAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
export const TH_DAYS_SHORT = {
  sun: "อา", mon: "จ", tue: "อ", wed: "พ", thu: "พฤ", fri: "ศ", sat: "ส"
};
export const TH_DAYS_FULL = {
  sun: "อาทิตย์", mon: "จันทร์", tue: "อังคาร", wed: "พุธ", thu: "พฤหัสบดี", fri: "ศุกร์", sat: "เสาร์"
};
export const WEEK_DAYS = [
  { key: "sun", label: "อา" }, { key: "mon", label: "จ" }, { key: "tue", label: "อ" },
  { key: "wed", label: "พ" }, { key: "thu", label: "พฤ" }, { key: "fri", label: "ศ" }, { key: "sat", label: "ส" },
];