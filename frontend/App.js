import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import LoginScreen from "./src/screens/Login";
import RegisterScreen from "./src/screens/Register";
import HomeDiaryScreen from "./src/screens/Home";
import ProfileScreen from "./src/screens/Profile";
import EditProfileScreen from "./src/screens/EditProfile";
import EditDiaryScreen from "./src/screens/EditDiary";
import ActivitiesScreen from "./src/screens/Activities";
import EditActivity from "./src/screens/EditActivity";
import ActivityUpdata from "./src/screens/ActivityUpdata";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// หน้าจอ Dummy สำหรับแท็บที่ไม่ต้องการให้แสดงเนื้อหา
function DummyScreen() {
  return null;
}

function MainTabs() {
  return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: "#1f6f8b",
          tabBarInactiveTintColor: "#777",
          tabBarIcon: ({ color, size, focused }) => {
            let iconName = "ellipse"; // fallback

            if (route.name === "กิจกรรม") {
              iconName = focused ? "calendar" : "calendar-outline";
            } else if (route.name === "บันทึก") {
              iconName = focused ? "book" : "book-outline";
            } else if (route.name === "แนวโน้ม") {
              iconName = focused ? "stats-chart" : "stats-chart-outline";
            } else if (route.name === "โปรไฟล์") {
              iconName = focused ? "person-circle" : "person-circle-outline";
            }

            return <Ionicons name={iconName} color={color} size={size} />;
          },
        })}
      >
        <Tab.Screen name="กิจกรรม" component={ActivitiesScreen} />
        <Tab.Screen name="บันทึก" component={HomeDiaryScreen} />
        <Tab.Screen name="แนวโน้ม" component={DummyScreen} />
        <Tab.Screen name="โปรไฟล์" component={ProfileScreen} />
      </Tab.Navigator>
  );
}

export default function App() {
  const [initial, setInitial] = useState(null); // เริ่มต้นเป็น null เพื่อรอเช็ค token

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem("token");
      setInitial(token ? "Main" : "Login");
    })();
  }, []);

  // ป้องกันหน้ากระพริบระหว่างรอเช็ค token
  if (initial === null) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initial}>
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: "เข้าสู่ระบบ", headerShown: false }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: "ลงทะเบียน" }} />
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "โปรไฟล์" }} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: "แก้ไขโปรไฟล์" }} />
        <Stack.Screen name="EditDiary" component={EditDiaryScreen} options={{ title: "การบันทึก" }} />
        <Stack.Screen name="Activities" component={ActivitiesScreen} options={{ title: "กิจกรรม" }} />
        <Stack.Screen name="EditActivity" component={EditActivity} options={{ title: "สิ่งที่ต้องทำ" }} />
        <Stack.Screen name="ActivityUpdata" component={ActivityUpdata} options={{ title: "รายละเอียดกิจกรรม" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

