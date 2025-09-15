import React, { useState } from "react";
import { View, Text, Platform, Button } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

export function toDateStr(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}
export function toTimeStr(d = new Date()) {
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

export default function DateTimeInput({ date, setDate, time, setTime, disabledTime }) {
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  const onDate = (_, pick) => { setShowDate(Platform.OS === "ios"); if (pick) setDate(toDateStr(pick)); };
  const onTime = (_, pick) => { setShowTime(Platform.OS === "ios"); if (pick) setTime(toTimeStr(pick)); };

  return (
    <View>
      <Text style={{ marginBottom: 6 }}>วันที่</Text>
      <Button title={date} onPress={() => setShowDate(true)} />
      {showDate && <DateTimePicker value={new Date(date)} mode="date" onChange={onDate} />}

      {!disabledTime && (
        <>
          <Text style={{ marginTop: 12, marginBottom: 6 }}>เวลา</Text>
          <Button title={time} onPress={() => setShowTime(true)} />
          {showTime && <DateTimePicker value={new Date(`2000-01-01T${time}:00`)} mode="time" onChange={onTime} />}
        </>
      )}
    </View>
  );
}
