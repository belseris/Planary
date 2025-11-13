// utils/constants.js

// 1. หมวดหมู่ (CATEGORIES)
export const CATEGORIES = [
  { name: "เรียน", emoji: "📚", label: "เรียน" },
  { name: "ทำงาน", emoji: "💼", label: "ทำงาน" },
  { name: "ออกกำลังกาย", emoji: "🏋️", label: "ออกกำลังกาย" },
  { name: "เรื่องบ้าน", emoji: "🏠", label: "เรื่องบ้าน" },
  { name: "ส่วนตัว", emoji: "👤", label: "ส่วนตัว" },
  { name: "สุขภาพ", emoji: "❤️‍🩹", label: "สุขภาพ" },
  // คุณสามารถเพิ่มหมวดหมู่อื่นๆ ที่นี่
];

// 2. สถานะ (STATUSES) - เป็นแหล่งข้อมูลเดียว
export const STATUSES = {
  normal:  { label: 'ยังไม่เริ่ม', backgroundColor: '#f0f0f0', color: '#595959' },
  warning: { label: 'กำลังทำ',   backgroundColor: '#fffbe6', color: '#faad14' },
  success: { label: 'เสร็จแล้ว',  backgroundColor: '#f6ffed', color: '#52c41a' },
  danger:  { label: 'ข้าม/ยกเลิก', backgroundColor: '#fff1f0', color: '#ff4d4f' },
};

// 3. ตัวเลือกสถานะสำหรับ Dropdown/Menu
export const STATUS_OPTIONS = Object.entries(STATUSES).map(([key, value]) => ({
    key,
    label: value.label
}));

// 4. วันในสัปดาห์
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