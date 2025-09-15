import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { createDiary, getDiary, updateDiary } from "../diary";

const MOODS = ["happy","neutral","sad","angry","cry"];

function toDateInput(d) {
  if (typeof d === "string") return d;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}
function toTimeInput(d) {
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${mi}`;
}

export default function EditDiary({ route, navigation }) {
  const id = route.params?.id;

  const [date, setDate] = useState(toDateInput(new Date()));
  const [time, setTime] = useState(toTimeInput(new Date()));
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [mood, setMood] = useState("neutral");
  const [tags, setTags] = useState(""); 

    const load = async () => {
    if (!id) return;
    try {
        const d = await getDiary(id);
        setDate(d.date);
        setTime(d.time.slice(0, 5));
        setTitle(d.title);
        setDetail(d.detail || "");
        setMood((d.mood || "neutral").toLowerCase());
        setTags(d.tags || "");
    } catch {
        Alert.alert("โหลดข้อมูลไม่สำเร็จ");
    }
    };

  useEffect(() => { load(); }, [id]);

  const onSave = async () => {
    const payload = { date, time: time.length === 5 ? `${time}:00` : time, title, detail, mood, tags };
    try {
      if (id) await updateDiary(id, payload);
      else await createDiary(payload);
      navigation.goBack();
    } catch {
      Alert.alert("บันทึกไม่สำเร็จ", "ตรวจสอบข้อมูล");
    }
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: "bold" }}>{id ? "แก้ไข" : "บันทึก"}</Text>
        <Button title="บันทึก" onPress={onSave} />
      </View>

      <Text style={{ marginBottom: 6 }}>วันที่ (YYYY-MM-DD)</Text>
      <TextInput value={date} onChangeText={setDate} style={styles.input} />

      <Text style={{ marginTop: 12, marginBottom: 6 }}>เวลา (HH:MM)</Text>
      <TextInput value={time} onChangeText={setTime} style={styles.input} />

      <Text style={{ marginTop: 12, marginBottom: 6 }}>ชื่อเรื่อง</Text>
      <TextInput value={title} onChangeText={setTitle} style={styles.input} />

      <Text style={{ marginTop: 12, marginBottom: 6 }}>รายละเอียด</Text>
      <TextInput value={detail} onChangeText={setDetail} style={[styles.input, { height: 120 }]} multiline />

      <Text style={{ marginTop: 12, marginBottom: 6 }}>อารมณ์</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {MOODS.map(m => (
          <View key={m} style={{ marginRight: 8, marginBottom: 8 }}>
            <Button title={m === mood ? `[${m}]` : m} onPress={() => setMood(m)} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = {
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 10, padding: 10 },
};
