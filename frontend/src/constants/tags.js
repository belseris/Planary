export const POSITIVE_GROUPS = [
  {
    title: "สุขภาพ & กายภาพ",
    data: [
      { emoji: "🛌", label: "นอนเต็มอิ่ม" },
      { emoji: "🍱", label: "อาหารอร่อย" },
      { emoji: "🏃", label: "ออกกำลังกาย" },
      { emoji: "💇", label: "ดูดีมั่นใจ" },
      { emoji: "🛁", label: "ผ่อนคลาย" }
    ]
  },
  {
    title: "งาน & ความสำเร็จ",
    data: [
      { emoji: "✅", label: "งานเสร็จ" },
      { emoji: "💰", label: "เงินเข้า" },
      { emoji: "💡", label: "คิดไอเดียออก" },
      { emoji: "📚", label: "เรียนรู้ใหม่" },
      { emoji: "🏆", label: "ภูมิใจในตัวเรา" }
    ]
  },
  {
    title: "สังคม & ความสุข",
    data: [
      { emoji: "🥰", label: "แฟนน่ารัก" },
      { emoji: "👨‍👩‍👧", label: "ครอบครัวอบอุ่น" },
      { emoji: "🍻", label: "ปาร์ตี้" },
      { emoji: "💬", label: "ได้รับคำชม" },
      { emoji: "🛍️", label: "ได้ช้อปปิ้ง" },
      { emoji: "✈️", label: "ได้เที่ยว" }
    ]
  }
];

export const NEGATIVE_GROUPS = [
  {
    title: "สุขภาพ & ร่างกาย",
    data: [
      { emoji: "😴", label: "นอนน้อย" },
      { emoji: "🤒", label: "ป่วย/ปวดหัว" },
      { emoji: "💩", label: "ท้องเสีย" },
      { emoji: "⚡", label: "เจ็บตัว" }
    ]
  },
  {
    title: "งาน & ปัญหา",
    data: [
      { emoji: "🤯", label: "งานเดือด" },
      { emoji: "🥱", label: "น่าเบื่อ" },
      { emoji: "🤬", label: "โดนดุ/ด่า" },
      { emoji: "📉", label: "ผิดพลาด" },
      { emoji: "💸", label: "เงินหมด" }
    ]
  },
  {
    title: "อารมณ์ & สิ่งแวดล้อม",
    data: [
      { emoji: "😤", label: "หงุดหงิด" },
      { emoji: "🥀", label: "น้อยใจ" },
      { emoji: "💔", label: "ทะเลาะกัน" },
      { emoji: "🚗", label: "รถติดนรก" },
      { emoji: "🔥", label: "ร้อนตับแตก" },
      { emoji: "🌧️", label: "เปียกฝน" }
    ]
  }
];

export const POSITIVE_TAGS = POSITIVE_GROUPS.flatMap((group) =>
  group.data.map((item) => item.label)
);
export const NEGATIVE_TAGS = NEGATIVE_GROUPS.flatMap((group) =>
  group.data.map((item) => item.label)
);

export const tagEmojiMap = [...POSITIVE_GROUPS, ...NEGATIVE_GROUPS].reduce(
  (acc, group) => {
    group.data.forEach((item) => {
      acc[item.label] = item.emoji;
    });
    return acc;
  },
  {}
);

export const emojiToTagMap = Object.entries(tagEmojiMap).reduce(
  (acc, [label, emoji]) => {
    acc[emoji] = label;
    return acc;
  },
  {}
);
