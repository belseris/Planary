# 🔔 คู่มือระบบแจ้งเตือนกิจกรรม (Activity Notification System)

## ภาพรวม

ระบบแจ้งเตือนใช้เทคนิค **Polling + Local Notification** ที่:
- ✅ **ทำงานแม้ app ปิด** (Background Fetch ทุก 10 นาที)
- ✅ **ไม่ต้องพึ่ง Firebase** (ใช้ Expo Notifications)
- ✅ **แสดงเวลาถอยหลัง** "อีก X นาที"
- ✅ **กดเพื่อเปิดหน้ากิจกรรม** (Deep Linking)
- ✅ **สั่น + เสียง** (ตั้งค่าได้)

---

## วิธีการทำงาน

```
┌─────────────────────────────────────────────┐
│  1. Background Task (ทุก 10 นาที)          │
│     ↓                                        │
│  2. ถาม Backend: /activities/upcoming       │
│     ↓                                        │
│  3. Backend ตอบ: กิจกรรมที่จะมาถึง (0-30 นาที)│
│     ↓                                        │
│  4. แสดง Local Notification                 │
│     ↓                                        │
│  5. ผู้ใช้กด → เปิด ActivityDetail          │
└─────────────────────────────────────────────┘
```

---

## การตั้งค่ากิจกรรมให้แจ้งเตือน

### ใน Frontend (EditActivity.js):

```javascript
// ตัวอย่าง: ผู้ใช้สร้างกิจกรรม
const activity = {
  title: "ออกกำลังกาย",
  date: "2026-01-12",
  time: "15:00",
  all_day: false,
  remind: true,                    // ✅ เปิดการแจ้งเตือน
  remind_offset_min: 15,           // แจ้งก่อน 15 นาที
  remind_type: "simple",           // แบบ Simple
  remind_sound: true,              // เปิดเสียง
};

await createActivity(activity);
```

### ตัวเลือก `remind_offset_min`:
- **5 นาที** - แจ้งเตือนก่อนเวลา 5 นาที
- **15 นาที** - แจ้งเตือนก่อนเวลา 15 นาที
- **30 นาที** - แจ้งเตือนก่อนเวลา 30 นาที
- **60 นาที** - แจ้งเตือนก่อนเวลา 1 ชั่วโมง

---

## Backend API

### **GET /activities/upcoming**
ดึงกิจกรรมที่จะมาถึงใน 30 นาทีข้างหน้า

**Request:**
```http
GET /activities/upcoming
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "abc-123",
    "title": "ออกกำลังกาย",
    "time": "15:00",
    "category": "health",
    "minutes_until": 15,
    "remind_sound": true,
    "remind_type": "simple"
  }
]
```

---

## การทดสอบ

### 1. ทดสอบ Backend Endpoint

```bash
# ต้อง login ก่อน (ได้ token)
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "test123"}'

# ดึงกิจกรรมที่จะมาถึง
curl http://localhost:8000/activities/upcoming \
  -H "Authorization: Bearer <your-token>"
```

### 2. ทดสอบ Frontend Notification

**วิธีที่ 1: สร้างกิจกรรมทดสอบ**
1. เปิด app
2. ไปหน้า "กิจกรรม"
3. สร้างกิจกรรมใหม่:
   - ชื่อ: "ทดสอบ Notification"
   - เวลา: 15 นาทีจากตอนนี้
   - เปิด "การแจ้งเตือน" ✅
   - ตั้งค่า "แจ้งก่อน 10 นาที"
4. รอ 5 นาที (background task จะทำงานครั้งถัดไป)
5. ดู notification ขึ้นที่หน้าจอ

**วิธีที่ 2: ทดสอบด้วย Console**
```javascript
// ใน App.js หรือ screen ใด ๆ
import { showActivityNotification } from './src/services/notificationService';

// ทดสอบแจ้งเตือนทันที
showActivityNotification({
  id: 'test-123',
  title: 'ทดสอบ Notification',
  minutes_until: 10,
  remind_sound: true,
});
```

---

## ไฟล์ที่เกี่ยวข้อง

### Backend:
- `backend/models/activity.py` - Activity model (เพิ่ม fields)
- `backend/routers/activities.py` - API endpoint `/activities/upcoming`
- `backend/schemas/activities.py` - Schema validation
- `backend/migrations/003_add_notification_fields.sql` - Database migration

### Frontend:
- `frontend/src/services/notificationService.js` - จัดการ notification
- `frontend/src/services/backgroundFetchService.js` - Background task
- `frontend/src/api/activities.js` - API client
- `frontend/App.js` - Notification handler & navigation

---

## Troubleshooting

### ❌ Notification ไม่ขึ้น
**สาเหตุ:**
1. ไม่ได้ให้ permission
2. Background fetch ไม่ทำงาน
3. กิจกรรมไม่ตรงเงื่อนไข

**วิธีแก้:**
```javascript
// ตรวจสอบ permission
import { requestNotificationPermission } from './src/services/notificationService';
const hasPermission = await requestNotificationPermission();
console.log('Permission:', hasPermission);

// ตรวจสอบ background fetch
import { checkBackgroundFetchStatus } from './src/services/backgroundFetchService';
const status = await checkBackgroundFetchStatus();
console.log('Background Fetch:', status);
```

### ❌ Background Task ไม่ทำงาน
**สำหรับ Android:**
- ต้อง build APK จริง (ใน Expo Go อาจไม่ทำงาน)
- ตรวจสอบ battery optimization settings

**สำหรับ iOS:**
- Background fetch ใน iOS จำกัด (ทำงานตาม OS กำหนด)
- ต้อง test ใน device จริง

---

## การ Deploy

### ขั้นตอน:
1. ✅ รัน migration: `003_add_notification_fields.sql`
2. ✅ Restart backend server
3. ✅ Build frontend ใหม่: `npx expo build`
4. ✅ Test บน device จริง (ไม่ใช่ Expo Go)

---

## คุณสมบัติเพิ่มเติม (อนาคต)

- [ ] ตั้งค่า notification interval แบบ custom
- [ ] รองรับ notification แบบ recurring
- [ ] แสดง notification summary (กิจกรรมทั้งวัน)
- [ ] Snooze notification (เลื่อนแจ้งเตือน)
- [ ] Quick actions (ทำเสร็จจาก notification)

---

## สรุป

✅ **ระบบพร้อมใช้งาน!**
- Backend: endpoint `/activities/upcoming`
- Frontend: Background fetch + Local notifications
- Database: Migration complete
- Navigation: กด notification → เปิด ActivityDetail

🎉 **ลองทดสอบได้เลย!**
