/**
 * App.js - จุดเริ่มต้นของแอปพลิเคชัน (Entry Point)
 * 
 * หน้าที่หลัก:
 * 1. ตรวจสอบ JWT token ว่าผู้ใช้เข้าสู่ระบบอยู่หรือไม่
 * 2. กำหนด Navigation Structure (Stack + Tab Navigator)
 * 3. จัดการ Auto-login และ Auto-diary creation
 * 4. จัดการ Notification Handler และ Background Fetch
 */

import React, { useEffect, useState, useRef } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from 'expo-notifications';
import { initAutoDiary } from "./src/autoDiaryService";
import YesterdayDiaryModal from './src/components/YesterdayDiaryModal';
import { listDiaries } from './src/api';
import { requestNotificationPermission } from './src/services/notificationService';
import { registerBackgroundFetch } from './src/services/backgroundFetchService';

// Import หน้าจอทั้งหมด (11 screens)
import LoginScreen from "./src/screens/Login";
import RegisterScreen from "./src/screens/Register";
import DiaryScreen from "./src/screens/Diary";
import ProfileScreen from "./src/screens/Profile";
import EditProfileScreen from "./src/screens/EditProfile";
import EditDiaryScreen from "./src/screens/EditDiary";
import ActivitiesScreen from "./src/screens/Activities";
import EditActivity from "./src/screens/EditActivity";
import ActivityDetailScreen from "./src/screens/ActivityDetail";
import EditRoutineScreen from "./src/screens/EditRoutine";
import TrendsScreen from "./src/screens/Trends";
import DebugScreen from "./src/screens/DebugScreen";

// สร้าง Navigator instances
const Stack = createNativeStackNavigator(); // สำหรับ navigation แบบ push/pop
const Tab = createBottomTabNavigator(); // สำหรับ bottom tab bar

/**
 * MainTabs Component
 * Bottom Tab Navigator หลังจาก login แล้ว
 * มี 4 tabs: กิจกรรม, บันทึก, แนวโน้ม, โปรไฟล์
 */
function MainTabs() {
  return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false, // ซ่อน header ของ tab (ใช้ header ของ screen แทน)
          tabBarActiveTintColor: "#1f6f8b", // สีของ tab ที่เลือกอยู่
          tabBarInactiveTintColor: "#777", // สีของ tab ที่ไม่ได้เลือก
          // กำหนด icon สำหรับแต่ละ tab
          tabBarIcon: ({ color, size, focused }) => {
            let iconName = "ellipse"; // fallback icon

            // เลือก icon ตามชื่อ route
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
        {/* 4 Tabs หลักของแอป */}
        <Tab.Screen name="กิจกรรม" component={ActivitiesScreen} />
        <Tab.Screen name="บันทึก" component={DiaryScreen} />
        <Tab.Screen name="แนวโน้ม" component={TrendsScreen} />
        <Tab.Screen name="โปรไฟล์" component={ProfileScreen} />
      </Tab.Navigator>
  );
}

/**
 * App Component (Main Entry Point)
 * 
 * Flow:
 * 1. ตรวจสอบ JWT token จาก AsyncStorage
 * 2. ถ้ามี token → ไป Main (Tab Navigator) + เรียก initAutoDiary()
 * 3. ถ้าไม่มี token → ไป Login
 * 4. สร้าง Stack Navigator สำหรับทุกหน้าจอ
 * 5. Setup notification handler และ background fetch
 */
export default function App() {
  // State สำหรับเก็บ initial route (null = กำลังโหลด)
  const [initial, setInitial] = useState(null);
  const [showYesterdayModal, setShowYesterdayModal] = useState(false);
  const [yesterdayISO, setYesterdayISO] = useState(null);
  
  // Ref สำหรับ navigation
  const navigationRef = useRef();
  const notificationListener = useRef();
  const responseListener = useRef();

  // ตรวจสอบ auth status เมื่อแอปเปิดครั้งแรก
  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem("token");
      // ถ้ามี token = logged in → ไปหน้า Main
      // ถ้าไม่มี = ยังไม่ login → ไปหน้า Login
      setInitial(token ? "Main" : "Login");
      
      if (token) {
        // Setup notification permissions และ background fetch
        const hasPermission = await requestNotificationPermission();
        if (hasPermission) {
          await registerBackgroundFetch();
          console.log('✅ Notification system ready');
        }

        // คำนวณวันที่เมื่อวาน
        const today = new Date(); const y = new Date(today); y.setDate(today.getDate() - 1);
        const iso = `${y.getFullYear()}-${String(y.getMonth()+1).padStart(2,'0')}-${String(y.getDate()).padStart(2,'0')}`;
        setYesterdayISO(iso);

        // ตรวจสอบว่ามี diary ของเมื่อวานหรือยัง
        try {
          const diaries = await listDiaries({ startDate: iso, endDate: iso });
          const hasDiary = Array.isArray(diaries) ? diaries.length > 0 : (diaries.items ? diaries.items.length > 0 : false);
          // ถ้าไม่มี → เปิด Modal; ถ้ามี → สร้าง draft ย้อนหลังอื่น ๆ แบบนุ่มนวล
          if (!hasDiary) {
            setShowYesterdayModal(true);
          }
          // เบื้องหลัง: เติม draft สำหรับวันก่อนหน้าที่ยังไม่มี (ย้อนไป 7 วัน)
          await initAutoDiary();
        } catch {
          // ถ้าตรวจไม่ได้ ก็ยังคงเติม draft เบื้องหลังตามเดิม
          await initAutoDiary();
        }
      }
    })();
  }, []);

  // Setup notification listeners (เมื่อกด notification)
  useEffect(() => {
    // Listener: เมื่อได้รับ notification ขณะที่ app เปิดอยู่
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📬 Notification received:', notification);
    });

    // Listener: เมื่อผู้ใช้กด notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      // ถ้าเป็น activity reminder → เปิดหน้า ActivityDetail
      if (data.type === 'activity_reminder' && data.activityId) {
        navigationRef.current?.navigate('ActivityDetail', { 
          activityId: data.activityId 
        });
      }
    });

    // Cleanup listeners
    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  // แสดงหน้าว่างขณะโหลด (ป้องกันหน้ากระพริบ)
  if (initial === null) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
      {showYesterdayModal && yesterdayISO && (
        <YesterdayDiaryModal
          visible={showYesterdayModal}
          dateISO={yesterdayISO}
          onClose={(saved) => { setShowYesterdayModal(false); }}
        />
      )}
      {/* Stack Navigator: จัดการการนำทางทั้งหมด */}
      <Stack.Navigator initialRouteName={initial}>
        {/* Auth Screens - ไม่ต้อง login */}
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: "เข้าสู่ระบบ", headerShown: false }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: "ลงทะเบียน" }} />
        
        {/* Main App - ต้อง login แล้ว (Tab Navigator) */}
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        
        {/* Modal/Detail Screens - เปิดทับ Tab Navigator */}
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "โปรไฟล์" }} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: "แก้ไขโปรไฟล์" }} />
        <Stack.Screen name="EditDiary" component={EditDiaryScreen} options={{ title: "การบันทึก" }} />
        <Stack.Screen name="Activities" component={ActivitiesScreen} options={{ title: "กิจกรรม" }} />
        <Stack.Screen name="EditActivity" component={EditActivity} options={{ title: "สิ่งที่ต้องทำ" }} />
        <Stack.Screen name="ActivityDetail" component={ActivityDetailScreen} options={{ title: "รายละเอียดกิจกรรม" }} />
        <Stack.Screen name="EditRoutine" component={EditRoutineScreen} options={{ title: "แม่แบบกิจกรรม" }} />
        <Stack.Screen name="Debug" component={DebugScreen} options={{ title: "🔍 Debug Notifications" }} />
      </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

