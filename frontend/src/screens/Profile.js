import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Image, Button } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { meApi } from "../auth";
import { BASE_URL } from "../api";

export default function ProfileScreen({ navigation }) {
  const [me, setMe] = useState(null);

  const load = async () => {
    try {
      const data = await meApi();
      setMe(data);
    } catch (e) {
      // ลบ token แล้วส่งไปหน้า Login
      await AsyncStorage.removeItem("token");
      navigation.replace("Login");
    }
  };

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem("token");
    navigation.replace("Login");
  }, [navigation]);

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    return unsub;
  }, [navigation]);

  if (!me)
    return (
      <View style={{ flex: 1, padding: 20 }}>
        <Text>กำลังโหลด...</Text>
      </View>
    );

  return (
    <View style={{ flex: 1, padding: 20 }}>
      {me.avatar_url ? (
        <Image
          source={{ uri: `${BASE_URL}${me.avatar_url}` }}
          style={{ width: 120, height: 120, borderRadius: 60, marginBottom: 12 }}
        />
      ) : (
        <View
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: "#ddd",
            marginBottom: 12,
          }}
        />
      )}
      <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 8 }}>
        {me.username}
      </Text>
      <Text>อีเมล: {me.email}</Text>
      <Text>เพศ: {me.gender}</Text>
      <Text>อายุ: {me.age} ปี</Text>

      <View style={{ height: 16 }} />
      <Button
        title="แก้ไขโปรไฟล์"
        onPress={() => navigation.navigate("EditProfile", { me })}
      />

      <View style={{ height: 12 }} />
      <Button title="ออกจากระบบ" onPress={logout} />
    </View>
  );
}
