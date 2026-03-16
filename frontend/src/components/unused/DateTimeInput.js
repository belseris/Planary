import React, { useState } from "react";
import { View, Text, Platform, Button } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

// แปลง Date -> "YYYY-MM-DD" สำหรับเก็บเป็นวันที่มาตรฐาน
// คำนวณโดยดึงปี/เดือน/วัน แล้วเติม 0 ด้านหน้าให้ครบ 2 หลัก
export function toDateStr(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

// แปลง Date -> "HH:MM" สำหรับเก็บเวลาแบบ 24 ชั่วโมง
// คำนวณจากชั่วโมงและนาที พร้อม padStart(2) ให้รูปแบบคงที่
export function toTimeStr(d = new Date()) {
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

export default function DateTimeInput({ date, setDate, time, setTime, disabledTime }) {
  // state คุมการแสดง popup picker (วันที่/เวลา)
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  // เมื่อเลือกวันที่: ปิด picker บน Android, คงเปิดบน iOS ตามพฤติกรรม native
  // ถ้ามีค่าที่เลือกจริง (pick) ให้แปลงและส่งกลับไป parent
  const onDate = (_, pick) => { setShowDate(Platform.OS === "ios"); if (pick) setDate(toDateStr(pick)); };

  // เมื่อเลือกเวลา: logic เหมือน onDate แต่แปลงเป็น HH:MM
  const onTime = (_, pick) => { setShowTime(Platform.OS === "ios"); if (pick) setTime(toTimeStr(pick)); };

  return (
    <View>
      <Text style={{ marginBottom: 6 }}>วันที่</Text>
      <Button title={date} onPress={() => setShowDate(true)} />
      {/* value ใช้ new Date(date) เพื่อให้ native picker อ่านค่าเริ่มต้นได้ */}
      {showDate && <DateTimePicker value={new Date(date)} mode="date" onChange={onDate} />}

      {!disabledTime && (
        <>
          <Text style={{ marginTop: 12, marginBottom: 6 }}>เวลา</Text>
          <Button title={time} onPress={() => setShowTime(true)} />
          {/* สร้าง Date จำลองจากเวลา HH:MM เพื่อใช้กับโหมด time โดยไม่ผูกกับวันที่จริง */}
          {showTime && <DateTimePicker value={new Date(`2000-01-01T${time}:00`)} mode="time" onChange={onTime} />}
        </>
      )}
    </View>
  );
}
