# Planary System Overview 📱

> **Smart Diary & Activity Planner Application**  
> แอปพลิเคชันบันทึกไดอารี่และจัดการกิจกรรมแบบอัจฉริยะ

---

## 🏗️ สถาปัตยกรรมระบบ (System Architecture)

```
┌─────────────────────────────────────────────────────┐
│              Frontend (React Native + Expo)         │
│  ┌──────────────────────────────────────────────┐  │
│  │  Screens (11 หน้าจอ)                         │  │
│  │  • Login, Register, Profile, EditProfile      │  │
│  │  • Diary, EditDiary                           │  │
│  │  • Activities, EditActivity, ActivityDetail   │  │
│  │  • EditRoutine, Trends                        │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │  API Layer (src/api/)                         │  │
│  │  • client.js - Axios + Interceptors           │  │
│  │  • auth.js, activities.js, diary.js, etc      │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │  Services & Utils                             │  │
│  │  • autoDiaryService, moodSystem               │  │
│  │  • dateUtils, constants                       │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                        ↕ HTTP/REST API
┌─────────────────────────────────────────────────────┐
│              Backend (FastAPI + Python)             │
│  ┌──────────────────────────────────────────────┐  │
│  │  Routers (7 API modules)                      │  │
│  │  • login, register, profile                   │  │
│  │  • diary, activities, routine_activities      │  │
│  │  • home                                        │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │  Models (SQLAlchemy ORM)                      │  │
│  │  • User, Diary, Activity, RoutineActivity     │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │  Database (PostgreSQL)                        │  │
│  │  • Tables: users, diaries, activities, etc    │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 📂 โครงสร้างโปรเจค (Project Structure)

### **Frontend (React Native)**

```
frontend/
├── App.js                          # จุดเริ่มต้น: Navigation & Auth Flow
├── src/
│   ├── api/                        # 🆕 API Layer (Centralized)
│   │   ├── client.js               # Axios client + interceptors (JWT, 401 handling)
│   │   ├── index.js                # Export ทั้งหมดแบบรวมศูนย์
│   │   ├── auth.js                 # Login, Register, Me APIs
│   │   ├── activities.js           # CRUD Activities
│   │   ├── diary.js                # CRUD Diary
│   │   └── routines.js             # CRUD Routine Templates
│   │
│   ├── screens/                    # หน้าจอทั้งหมด (11 screens)
│   │   ├── Login.js                # หน้าเข้าสู่ระบบ
│   │   ├── Register.js             # หน้าลงทะเบียน
│   │   ├── Profile.js              # โปรไฟล์ + แม่แบบกิจกรรมตามวัน
│   │   ├── EditProfile.js          # แก้ไขโปรไฟล์ + เปลี่ยนรหัสผ่าน + อัปโหลดรูป
│   │   ├── Diary.js                # รายการบันทึกไดอารี่ (แสดงตามเดือน)
│   │   ├── EditDiary.js            # สร้าง/แก้ไข/ลบบันทึก + 2D Mood System
│   │   ├── Activities.js           # รายการกิจกรรมตามวัน (Weekly view)
│   │   ├── EditActivity.js         # สร้าง/แก้ไขกิจกรรม + Subtasks
│   │   ├── ActivityDetail.js       # ดูรายละเอียด + ลบ + เปลี่ยนสถานะ
│   │   ├── EditRoutine.js          # สร้าง/แก้ไขแม่แบบกิจกรรม
│   │   └── Trends.js               # 🆕 Dashboard แสดงแนวโน้ม (Mock data)
│   │
│   ├── components/                 # Reusable Components
│   │   ├── TextInputField.js       # Input field พร้อม label
│   │   ├── StatusPill.js           # Badge แสดงสถานะ (เสร็จ/กำลังทำ/รอ)
│   │   └── DateTimeInput.js        # เลือกวัน-เวลา
│   │
│   ├── utils/                      # Utility Functions
│   │   ├── constants.js            # Constants: CATEGORIES, STATUSES, DAYS
│   │   └── dateUtils.js            # toDateString, toTimeString, getStartOfWeek
│   │
│   ├── services/                   # Business Logic Services
│   │   ├── autoDiaryService.js     # สร้าง draft diary อัตโนมัติทุกวัน
│   │   ├── moodSystem.js           # 2D Mood System (Good/Bad + Emoji Tags)
│   │   └── summarizeActivities.js  # สร้างสรุปกิจกรรมอัตโนมัติ
│   │
│   └── assets/                     # รูปภาพและไฟล์ static
│       └── logo.png
│
└── package.json                    # Dependencies
```

### **Backend (FastAPI + Python)**

```
backend/
├── main.py                         # จุดเริ่มต้น: FastAPI app + CORS + Routers
├── routers/                        # API Endpoints (7 modules)
│   ├── login.py                    # POST /login/token - รับ JWT token
│   ├── register.py                 # POST /register - ลงทะเบียนผู้ใช้ใหม่
│   ├── profile.py                  # GET/PUT/PATCH /profile/* - จัดการโปรไฟล์
│   ├── diary.py                    # CRUD /diary - บันทึกไดอารี่
│   ├── activities.py               # CRUD /activities - กิจกรรมรายวัน
│   ├── routine_activities.py       # CRUD /routine-activities - แม่แบบกิจกรรม
│   └── home.py                     # GET /home/diaries - รายการไดอารี่หน้าแรก
│
├── models/                         # SQLAlchemy ORM Models
│   ├── user.py                     # ตาราง users
│   ├── diary.py                    # ตาราง diaries (+ mood_score, mood_tags)
│   ├── activity.py                 # ตาราง activities
│   └── routine_activity.py         # ตาราง routine_activities
│
├── schemas/                        # Pydantic Schemas (Request/Response)
│   ├── login.py, register.py
│   ├── profile.py
│   ├── diary.py
│   ├── activities.py
│   ├── routine_activity.py
│   └── home.py
│
├── core/                           # Core Configuration
│   ├── config.py                   # Environment variables
│   └── security.py                 # JWT utilities (create_token, verify_token)
│
├── db/
│   └── session.py                  # Database connection (PostgreSQL)
│
├── migrations/                     # SQL Migration Scripts
│   └── 001_add_mood_score_tags.sql # เพิ่มคอลัมน์ mood_score, mood_tags
│
├── media/avatars/                  # ไฟล์รูป avatar ที่อัปโหลด
└── pyproject.toml                  # Python dependencies (Poetry)
```

---

## 🔑 ฟีเจอร์หลัก (Core Features)

### 1. **Authentication & Authorization**
- **Login**: อีเมล + รหัสผ่าน → JWT token
- **Register**: ลงทะเบียนด้วย email, username, password, gender, age
- **JWT Protection**: ทุก API ต้องแนบ Bearer token (ยกเว้น login/register)
- **Session Expiry**: Auto-logout เมื่อ 401 Unauthorized

### 2. **Profile Management**
- **ดูโปรไฟล์**: GET /profile/me
- **แก้ไขโปรไฟล์**: username, gender, age
- **เปลี่ยนรหัสผ่าน**: ตรวจสอบ old password ก่อน
- **อัปโหลดรูป Avatar**: multipart/form-data → บันทึกใน backend/media/avatars/

### 3. **Diary System (Smart Diary v2)**
- **สร้าง/แก้ไข/ลบบันทึก**
- **2D Mood Tracking**:
  - **มิติที่ 1**: Good Day 👍 / Bad Day 👎
  - **มิติที่ 2**: Emoji Tags (สาเหตุ) - เช่น 😊 สุขสมหวัง, 😫 เครียด
- **Auto-fill Summary**: สรุปกิจกรรมของวันนั้นอัตโนมัติ
- **Auto-create Draft**: สร้าง draft diary ของวันก่อนหน้าทุกครั้งที่เปิดแอป

### 4. **Activity Management**
- **CRUD Activities**: title, category (🎓เรียน, 💼ทำงาน, ✈️ท่องเที่ยว, etc)
- **Date & Time**: วันที่ + เวลา หรือ "ทั้งวัน"
- **Status**: ⬜ รอ / 🟧 กำลังทำ / ✅ เสร็จ
- **Subtasks**: รายการย่อย (checkbox) สำหรับงานใหญ่
- **Notes**: รายละเอียดเพิ่มเติม
- **Routine Integration**: กิจกรรมที่สร้างจากแม่แบบจะมีพื้นหลังสีน้ำเงิน

### 5. **Routine Activity Templates (แม่แบบกิจกรรม)**
- **สร้างแม่แบบตามวัน**: จันทร์ - อาทิตย์
- **Quick Create**: กดสร้างกิจกรรมจากแม่แบบได้ทันที
- **Use Case**: กิจกรรมประจำ เช่น เรียน, ออกกำลังกาย ทุกวันพุธ

### 6. **Trends Dashboard** (Mock)
- แสดงสถิติคร่าวๆ:
  - อารมณ์เฉลี่ย (emoji)
  - อัตราสำเร็จกิจกรรม (%)
  - จำนวนกิจกรรมที่เสร็จ/ทั้งหมด
- **Note**: ยังเป็น mock data - พร้อมต่อยอดเชื่อม API

---

## 🔐 Security & Authentication Flow

### JWT Token Flow
```
1. Login (POST /login/token)
   ├─ Input: email, password
   ├─ Validate: ตรวจสอบ bcrypt hash
   └─ Output: { access_token, token_type: "bearer" }

2. Store Token
   └─ AsyncStorage.setItem("token", access_token)

3. API Requests
   ├─ Axios Interceptor: แนบ "Authorization: Bearer {token}"
   └─ Backend: verify_token() → ดึง current_user

4. Token Expiry
   ├─ 401 Response
   ├─ Axios Interceptor: Alert + Clear token
   └─ Navigate to Login
```

---

## 🗄️ Database Schema

### **users**
```sql
id UUID PRIMARY KEY
email VARCHAR(255) UNIQUE
username VARCHAR(100)
password_hash VARCHAR(255)  -- bcrypt
gender VARCHAR(10)
age INTEGER
avatar_url TEXT
created_at TIMESTAMP
```

### **diaries**
```sql
id UUID PRIMARY KEY
user_id UUID FK → users.id
date DATE
time TIME
title VARCHAR(255)
detail TEXT
mood VARCHAR(50)             -- emoji 😊
mood_score VARCHAR(10)       -- 'good' | 'bad' | NULL
mood_tags JSONB              -- ['😊', '🚀', ...]
tags JSONB                   -- tags อื่นๆ
activities JSONB             -- [{ id, title, rating, ... }]
created_at TIMESTAMP
```

### **activities**
```sql
id UUID PRIMARY KEY
user_id UUID FK → users.id
routine_id UUID FK → routine_activities.id (NULL = ไม่ได้มาจากแม่แบบ)
title VARCHAR(255)
category VARCHAR(50)         -- 'เรียน', 'ทำงาน', ...
date DATE
time TIME
all_day BOOLEAN
status VARCHAR(20)           -- 'pending', 'in_progress', 'completed'
notes TEXT
subtasks JSONB               -- [{ id, text, completed }, ...]
created_at TIMESTAMP
```

### **routine_activities**
```sql
id UUID PRIMARY KEY
user_id UUID FK → users.id
title VARCHAR(255)
category VARCHAR(50)
day_of_week VARCHAR(10)      -- 'mon', 'tue', ...
time TIME
created_at TIMESTAMP
```

---

## 📡 API Endpoints Summary

### **Authentication**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/login/token` | เข้าสู่ระบบ (รับ JWT) |
| POST | `/register` | ลงทะเบียนผู้ใช้ใหม่ |

### **Profile**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profile/me` | ดูข้อมูลตัวเอง |
| PUT | `/profile/update` | อัปเดตโปรไฟล์ |
| PATCH | `/profile/password` | เปลี่ยนรหัสผ่าน |
| POST | `/profile/avatar` | อัปโหลดรูป avatar |

### **Diary**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/diary` | ดึงรายการบันทึก (filter: start_date, end_date) |
| POST | `/diary` | สร้างบันทึกใหม่ |
| GET | `/diary/{id}` | ดูบันทึกหนึ่งรายการ |
| PUT | `/diary/{id}` | แก้ไขบันทึก |
| DELETE | `/diary/{id}` | 🆕 ลบบันทึก |

### **Activities**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/activities` | ดึงกิจกรรม (filter: qdate, status, category) |
| POST | `/activities` | สร้างกิจกรรม |
| GET | `/activities/{id}` | ดูรายละเอียด |
| PUT | `/activities/{id}` | แก้ไข |
| DELETE | `/activities/{id}` | ลบ |

### **Routine Activities**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/routine-activities` | ดึงแม่แบบ (filter: day_of_week) |
| POST | `/routine-activities` | สร้างแม่แบบ |
| PUT | `/routine-activities/{id}` | แก้ไข |
| DELETE | `/routine-activities/{id}` | ลบ |

### **Home**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/home/diaries` | ดึงบันทึกล่าสุด (สำหรับหน้าแรก) |

---

## 🎨 UI/UX Highlights

### **Navigation Structure**
```
Stack Navigator (Root)
├── Login Screen
├── Register Screen
└── Main (Tab Navigator)
    ├── Tab: กิจกรรม (Activities)
    ├── Tab: บันทึก (Diary)
    ├── Tab: แนวโน้ม (Trends)
    └── Tab: โปรไฟล์ (Profile)

Modal Screens (Stack):
├── EditDiary
├── EditActivity
├── ActivityDetail
├── EditRoutine
└── EditProfile
```

### **Design Patterns**
- **Card-based UI**: ใช้ cards สำหรับแสดงรายการ
- **Weekly Selector**: เลือกวันได้แบบ week view (7 วัน)
- **Color Coding**: 
  - 🔵 กิจกรรมจากแม่แบบ (พื้นหลังสีฟ้า)
  - 🟢 เสร็จแล้ว (สีเขียว badge)
  - 🟠 กำลังทำ (สีส้ม badge)
- **Emoji-first**: ใช้ emoji เป็น visual indicator

---

## 🚀 Key Technologies

### **Frontend**
- **React Native**: Cross-platform mobile
- **Expo**: Development framework
- **React Navigation**: Stack + Bottom Tabs
- **Axios**: HTTP client
- **AsyncStorage**: Local storage (JWT token)

### **Backend**
- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: ORM
- **PostgreSQL**: Database
- **Pydantic**: Data validation
- **JWT**: Authentication
- **Bcrypt**: Password hashing
- **Uvicorn**: ASGI server

---

## 📝 Recent Changes (Nov 2025)

### ✅ Completed
1. **API Consolidation** (Frontend Refactoring)
   - รวม API clients: `apiClient.js`, `api.js`, `auth.js` → `api/` directory
   - สร้าง `api/index.js` สำหรับ centralized exports
   - อัปเดต imports ใน 11 screens + services

2. **2D Mood System** (Database Migration)
   - เพิ่มคอลัมน์: `mood_score` VARCHAR(10), `mood_tags` JSONB
   - UI: เลือก Good/Bad Day + Emoji Tags
   - Backend: validation + CRUD support

3. **UI Improvements**
   - ลบส่วน "ความรู้สึกวันนี้" และ "กิจกรรมของวันนี้" ออกจาก EditDiary
   - แก้ไข Tab Navigation syntax (component prop)
   - เพิ่ม Trends dashboard (3-card layout)

4. **DELETE Endpoint**
   - เพิ่ม `DELETE /diary/{id}` endpoint
   - เพิ่มปุ่มลบ (trash icon) ใน EditDiary header

5. **Bug Fixes**
   - แก้ Navigation parameter: `diaryId` → `id`
   - ลบ `__DEV__` conditional rendering ที่ทำให้ crash
   - Clear Metro bundler cache

---

## 📋 TODO / Future Enhancements

### Priority 1 (Organization)
- [ ] **A**: สร้าง root `.gitignore` + ลบ `__pycache__` ที่ tracked
- [ ] **B**: สร้าง `backend/.env.example` + migration helper scripts
- [ ] **C**: ตั้งค่า Alembic สำหรับ database migrations
- [ ] **D**: เพิ่ม GitHub Actions CI/CD (linting, testing)

### Priority 2 (Features)
- [ ] เชื่อม Trends dashboard กับ API จริง (คำนวณสถิติ)
- [ ] เพิ่ม Charts/Graphs สำหรับแนวโน้ม
- [ ] Notification/Reminder system
- [ ] Export diary เป็น PDF
- [ ] Search & Filter ขั้นสูง

### Priority 3 (Performance)
- [ ] Pagination สำหรับ Diary/Activities list
- [ ] Caching strategy
- [ ] Image optimization (avatar)
- [ ] Offline mode support

---

## 🛠️ Development Setup

### **Prerequisites**
- Node.js 18+
- Python 3.11+
- PostgreSQL 14+
- Android Studio (for Android emulator)

### **Frontend Setup**
```bash
cd frontend
npm install
npx expo start
# Press 'a' to open Android emulator
```

### **Backend Setup**
```bash
cd backend
pip install -r requirements.txt  # or poetry install
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### **Database Setup**
```sql
CREATE DATABASE Diary_db;
-- Run migrations in backend/migrations/
```

---

## 👨‍💻 Code Conventions

### **Frontend**
- **Components**: PascalCase (e.g., `EditDiary.js`)
- **Functions**: camelCase (e.g., `generateActivitySummary`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MOOD_CATEGORIES`)
- **Imports**: Absolute path จาก `src/` เท่านั้น → ใช้ relative `../api`

### **Backend**
- **Files**: snake_case (e.g., `diary.py`)
- **Classes**: PascalCase (e.g., `DiaryCreate`)
- **Functions**: snake_case (e.g., `create_diary`)
- **Endpoints**: kebab-case (e.g., `/routine-activities`)

---

## 📞 Contact & Support

**Developer**: belseris  
**Repository**: [PJ](https://github.com/belseris/PJ)  
**Branch**: main  
**Last Updated**: November 14, 2025

---

**สรุป**: Planary เป็นแอปบันทึกไดอารี่และจัดการกิจกรรมที่รวมฟีเจอร์ 2D Mood Tracking, Routine Templates, และ Smart Auto-fill เข้าด้วยกัน พร้อมโครงสร้างโค้ดที่เป็นระเบียบและ API layer ที่ centralized แล้ว 🎉
