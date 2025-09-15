// src/screens/HomeDiaryScreen.js  (หรือ Home.js ถ้าคุณใช้ชื่อนี้ใน App.js)
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, Alert, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { listDiaries, deleteDiary } from "../diary";

function groupByDate(items) {
  const map = {};
  items.forEach((it) => {
    const key = it.date; // "YYYY-MM-DD"
    if (!map[key]) map[key] = [];
    map[key].push(it);
  });
  // เรียงวันที่ใหม่ล่าสุดก่อน
  return Object.entries(map).sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

export default function HomeDiaryScreen({ navigation }) {
  const tabBarHeight = useBottomTabBarHeight(); // ต้องเรียกใน component เท่านั้น
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listDiaries();
      setItems(data.items || []);
    } catch (e) {
      Alert.alert("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    return unsub;
  }, [navigation, load]);

  const grouped = useMemo(() => groupByDate(items), [items]);

  const onDelete = async (id) => {
    try {
      await deleteDiary(id);
      await load();
    } catch (e) {
      Alert.alert("ลบไม่สำเร็จ");
    }
  };

  const renderCard = (it) => (
    <View
      key={it.id}
      style={{
        backgroundColor: "#eee",
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
      }}
    >
      <Text style={{ color: "#666", marginBottom: 4 }}>{it.time} นาฬิกา</Text>
      <Text style={{ fontWeight: "bold", marginBottom: 4 }}>{it.title}</Text>
      <Text numberOfLines={1} style={{ marginBottom: 8 }}>
        {it.detail || ""}
      </Text>

      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text>อารมณ์: {it.mood}</Text>
        <View style={{ flexDirection: "row" }}>
          <TouchableOpacity onPress={() => navigation.navigate("EditDiary", { id: it.id })}>
            <Text style={{ marginRight: 16 }}>แก้ไข</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(it.id)}>
            <Text style={{ color: "red" }}>ลบ</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderGroup = ({ item: [dateStr, arr] }) => (
    <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
      <Text style={{ color: "#888", marginBottom: 8 }}>{}</Text>
      {arr.map(renderCard)}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      {/* รายการบันทึก */}
      <FlatList
        data={grouped}
        keyExtractor={([dateStr]) => dateStr}
        renderItem={renderGroup}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        // กันพื้นที่ด้านล่างไม่ให้โดน FAB/TabBar ทับ
        contentContainerStyle={{ paddingTop: 8, paddingBottom: tabBarHeight + 96 }}
        ListEmptyComponent={
          !loading ? (
            <View style={{ paddingTop: 48, alignItems: "center" }}>
              <Text style={{ color: "#999" }}>ยังไม่มีบันทึก ลองเพิ่มกิจกรรมดู</Text>
            </View>
          ) : null
        }
      />

      {/* FAB เพิ่มกิจกรรม */}
      <TouchableOpacity
        onPress={() => navigation.navigate("EditDiary")}
        activeOpacity={0.85}
        style={{
          position: "absolute",
          right: 16,
          bottom: tabBarHeight + 16, // ลอยเหนือแท็บบาร์พอดี
          backgroundColor: "#1f6f8b",
          height: 52,
          paddingHorizontal: 16,
          borderRadius: 26,
          flexDirection: "row",
          alignItems: "center",
          shadowColor: "#000",
          shadowOpacity: 0.2,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 },
          elevation: 6,
        }}
      >
        <Ionicons name="add" size={22} color="#fff" />
        <Text style={{ color: "#fff", marginLeft: 8, fontWeight: "600" }}>เพิ่มบันทึก</Text>
      </TouchableOpacity>
    </View>
  );
}
