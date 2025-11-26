# 📚 คู่มือระบบ Planary - ฉบับสมบูรณ์

## 🎯 ภาพรวมแอปพลิเคชัน

**Planary** คือแอปพลิเคชันจัดการกิจกรรมและบันทึกไดอารี่ที่ช่วยให้ผู้ใช้:
- วางแผนกิจกรรมประจำวัน พร้อมงานย่อย (subtasks)
- สร้างแม่แบบกิจกรรมประจำสัปดาห์ (routine templates)
- บันทึกไดอารี่พร้อม mood และ tags
- ดูสถิติและแนวโน้มการทำกิจกรรม (Trends Dashboard)

---

## 🏗️ สถาปัตยกรรมระบบ

```
┌─────────────────────────────────────────────────────────────┐
│                    MOBILE APP (React Native)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Login   │  │Activities│  │  Diary   │  │ Profile  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│         │             │             │             │          │
│         └─────────────┴─────────────┴─────────────┘          │
│                         │                                    │
│                    API Client                                │
│                         │                                    │
└─────────────────────────┼────────────────────────────────────┘
                          │ HTTP/JSON
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND API (FastAPI)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Login   │  │Activities│  │  Diary   │  │ Profile  │   │
│  │  Router  │  │  Router  │  │  Router  │  │  Router  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│         │             │             │             │          │
│         └─────────────┴─────────────┴─────────────┘          │
│                         │                                    │
│                    SQLAlchemy ORM                            │
│                         │                                    │
└─────────────────────────┼────────────────────────────────────┘
                          │
                          ▼
                ┌──────────────────┐
                │   PostgreSQL DB   │
                └──────────────────┘
```

---

# 📁 โครงสร้าง BACKEND (FastAPI + PostgreSQL)

## 📂 `/backend` - โฟลเดอร์หลัก

### 🔧 **main.py** - จุดเริ่มต้นของ Backend
**หน้าที่:**
- สร้าง FastAPI application
- เปิดใช้งาน CORS (ให้ frontend เรียก API ได้)
- เชื่อมต่อ routers ทั้งหมด
- สร้างตารางในฐานข้อมูล (ถ้ายังไม่มี)

**โค้ดสำคัญ:**
```python
app = FastAPI(title="Planary API")
app.add_middleware(CORSMiddleware, allow_origins=["*"])  # อนุญาตทุก origin
app.include_router(login.router)
app.include_router(register.router)
app.include_router(activities.router)
app.include_router(diary.router)
app.include_router(profile.router)
app.include_router(routine_activities.router)
app.include_router(trends.router)
```

---

## 📂 `/backend/core` - การตั้งค่าหลัก

### **config.py** - จัดการ Environment Variables
**หน้าที่:**
- อ่านค่าจากไฟล์ `.env`
- เก็บค่าคงที่ เช่น DATABASE_URL, SECRET_KEY
- กำหนด path สำหรับเก็บไฟล์ media

**ตัวอย่าง:**
```python
DATABASE_URL=postgresql+psycopg2://postgres:password@localhost:5432/Diary_db
SECRET_KEY=your-secret-key-for-jwt
ACCESS_TOKEN_EXPIRE_MINUTES=120
```

### **security.py** - ระบบรักษาความปลอดภัย
**หน้าที่:**
1. **Hash Password**: ใช้ bcrypt เข้ารหัสรหัสผ่าน
2. **Verify Password**: ตรวจสอบรหัสผ่านที่ hash แล้ว
3. **Create JWT Token**: สร้าง access token สำหรับ authentication
4. **Decode JWT Token**: ถอดรหัส token เพื่อดึง user_id

**ฟังก์ชันสำคัญ:**
```python
hash_password(password: str) -> str           # เข้ารหัสรหัสผ่าน
verify_password(plain, hashed) -> bool        # ตรวจสอบรหัสผ่าน
create_access_token(data: dict) -> str        # สร้าง JWT token
get_current_user(token: str) -> User          # ดึงข้อมูล user จาก token
```

---

## 📂 `/backend/db` - ฐานข้อมูล

### **session.py** - จัดการ Database Session
**หน้าที่:**
- สร้าง database engine (เชื่อมต่อกับ PostgreSQL)
- สร้าง session factory
- สร้าง Base class สำหรับ models
- มี dependency `get_db()` สำหรับใช้ใน routers

**การใช้งาน:**
```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

## 📂 `/backend/models` - โมเดลฐานข้อมูล (Tables)

### **user.py** - ตาราง users
**โครงสร้าง:**
```python
id: UUID (Primary Key)
email: String (Unique)
full_name: String
hashed_password: String
avatar_url: String (path รูปภาพ)
created_at: DateTime
```

### **activity.py** - ตาราง activities
**โครงสร้าง:**
```python
id: UUID (Primary Key)
user_id: UUID (Foreign Key → users)
routine_id: UUID (Foreign Key → routine_activities, nullable)
date: Date
title: String (ชื่อกิจกรรม)
category: String (work, personal, health, social, etc.)
time: Time (nullable)
status: String (normal, urgent, done, cancelled)
all_day: Boolean
notes: String(2000) (รายละเอียด)
subtasks: JSONB (งานย่อย [{id, text, completed}])
created_at: DateTime
```

**ตัวอย่าง subtasks:**
```json
[
  {"id": "uuid1", "text": "เตรียมเอกสาร", "completed": false},
  {"id": "uuid2", "text": "ส่งอีเมล", "completed": true}
]
```

### **routine_activity.py** - ตาราง routine_activities (แม่แบบ)
**โครงสร้าง:**
```python
id: UUID (Primary Key)
user_id: UUID (Foreign Key → users)
day_of_week: String (mon, tue, wed, thu, fri, sat, sun)
title: String (ชื่อแม่แบบ)
category: String
time: Time (nullable)
notes: String(2000) (รายละเอียดแม่แบบ)
subtasks: JSONB (งานย่อยแม่แบบ)
```

**ความสัมพันธ์กับ Activity:**
- เมื่อสร้าง activity จากแม่แบบ → `activity.routine_id` จะชี้ไปที่ `routine_activity.id`
- เมื่อลบแม่แบบ → `activity.routine_id` จะถูกตั้งเป็น NULL

### **diary.py** - ตาราง diary_entries
**โครงสร้าง:**
```python
id: UUID (Primary Key)
user_id: UUID (Foreign Key → users)
date: Date (Unique per user)
mood_score: Integer (1-5)
mood_tags: JSONB (array ของ emoji tags)
summary: String(5000) (บันทึกประจำวัน)
created_at: DateTime
updated_at: DateTime
```

**ตัวอย่าง mood_tags:**
```json
["😊", "💪", "📚", "☕"]
```

---

## 📂 `/backend/schemas` - Pydantic Schemas (Validation)

### **หน้าที่ของ Schemas:**
1. **Validate Request**: ตรวจสอบข้อมูลที่ส่งมาจาก frontend
2. **Validate Response**: กำหนดรูปแบบข้อมูลที่ส่งกลับ
3. **Type Hints**: ช่วยให้ FastAPI สร้าง documentation อัตโนมัติ

### **activities.py**
```python
ActivityCreate:  # สร้างกิจกรรมใหม่
  - title: str
  - category: str
  - date: date
  - time: Optional[time]
  - status: str
  - notes: Optional[str]
  - subtasks: Optional[List[Dict]]

ActivityUpdate:  # อัปเดตกิจกรรม (ทุก field เป็น Optional)
  - title: Optional[str]
  - status: Optional[str]
  - notes: Optional[str]
  - subtasks: Optional[List[Dict]]

ActivityOut:  # ส่งกลับไปยัง frontend
  - id: UUID
  - title: str
  - date: date
  - status: str
  - routine_id: Optional[UUID]
  - subtasks: Optional[List[Dict]]
```

### **routine_activity.py**
```python
RoutineActivityCreate:
  - title: str
  - category: Optional[str]
  - time: Optional[time]
  - day_of_week: Optional[str]
  - notes: Optional[str]
  - subtasks: Optional[List[Dict]]

RoutineActivityResponse:
  - id: UUID
  - title: str
  - day_of_week: str
  - notes: Optional[str]
  - subtasks: Optional[List[Dict]]
```

---

## 📂 `/backend/routers` - API Endpoints

### **login.py** - `/login/token`
**Endpoint:** `POST /login/token`
**หน้าที่:**
1. รับ email + password
2. ค้นหา user ในฐานข้อมูล
3. ตรวจสอบรหัสผ่าน (bcrypt verify)
4. สร้าง JWT token
5. ส่ง token กลับไป

**Request:**
```json
{
  "email": "user@example.com",
  "password": "mypassword"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1...",
  "token_type": "bearer"
}
```

### **register.py** - `/register`
**Endpoint:** `POST /register`
**หน้าที่:**
1. รับข้อมูล user (email, password, full_name)
2. ตรวจสอบว่า email ซ้ำหรือไม่
3. Hash password
4. สร้าง user ใหม่ในฐานข้อมูล

### **activities.py** - `/activities`

#### `GET /activities?qdate=2025-11-23`
**หน้าที่:**
1. รับวันที่จาก query parameter
2. ดึง routine templates ของวันนั้น (จาก day_of_week)
3. ดึง activities ที่มีอยู่แล้ว
4. **สร้าง activity ใหม่จาก routine templates** (ถ้ายังไม่มี)
5. ส่ง activities ทั้งหมดกลับไป

**Logic สำคัญ:**
```python
# 1. ดึง routine templates ของวันนั้น (เช่น mon, tue, wed)
routine_templates = db.query(RoutineActivity).filter(
    RoutineActivity.day_of_week == day_key,
    RoutineActivity.user_id == user.id
).all()

# 2. ดึง activities ที่มีอยู่แล้ว
existing_activities = db.query(Activity).filter(
    Activity.date == target_date,
    Activity.user_id == user.id
).all()

# 3. หาว่าแม่แบบไหนยังไม่ถูกสร้าง
existing_routine_ids = {act.routine_id for act in existing_activities}

# 4. สร้าง activities ใหม่จากแม่แบบ
for template in routine_templates:
    if template.id not in existing_routine_ids:
        # คัดลอก notes และ subtasks (รีเซ็ต completed เป็น false)
        new_activity = Activity(
            user_id=user.id,
            routine_id=template.id,
            title=template.title,
            category=template.category,
            time=template.time,
            notes=template.notes,
            subtasks=copy_subtasks(template.subtasks)  # สร้าง ID ใหม่
        )
        db.add(new_activity)
```

#### `GET /activities/{id}`
**หน้าที่:** ดึงรายละเอียดกิจกรรม 1 รายการ

#### `POST /activities`
**หน้าที่:** สร้างกิจกรรมใหม่ (manual)

#### `PUT /activities/{id}`
**หน้าที่:** อัปเดตกิจกรรม (title, status, notes, subtasks)

#### `DELETE /activities/{id}`
**หน้าที่:** ลบกิจกรรม

### **routine_activities.py** - `/routine-activities`

#### `GET /routine-activities`
**หน้าที่:** ดึงแม่แบบทั้งหมดของ user

#### `POST /routine-activities`
**หน้าที่:** สร้างแม่แบบใหม่

**Request:**
```json
{
  "title": "ออกกำลังกาย",
  "category": "health",
  "time": "06:00:00",
  "day_of_week": "mon",
  "notes": "วิ่ง 5 กิโลเมตร",
  "subtasks": [
    {"id": "uuid1", "text": "เตรียมชุดวิ่ง", "completed": false},
    {"id": "uuid2", "text": "วอร์มอัพ", "completed": false}
  ]
}
```

#### `PUT /routine-activities/{id}`
**หน้าที่:** แก้ไขแม่แบบ

#### `DELETE /routine-activities/{id}`
**หน้าที่:** ลบแม่แบบ
- ตั้ง `activity.routine_id = NULL` สำหรับ activities ที่สร้างจากแม่แบบนี้
- ลบแม่แบบ

### **diary.py** - `/diary`

#### `GET /diary?start_date=2025-11-01&end_date=2025-11-30`
**หน้าที่:** ดึงไดอารี่ในช่วงเวลาที่กำหนด

#### `GET /diary/{id}`
**หน้าที่:** ดึงไดอารี่ 1 รายการ

#### `POST /diary`
**หน้าที่:** สร้างไดอารี่ใหม่

**Request:**
```json
{
  "date": "2025-11-23",
  "mood_score": 4,
  "mood_tags": ["😊", "💪", "📚"],
  "summary": "วันนี้ทำงานเสร็จตามแผน"
}
```

#### `PUT /diary/{id}`
**หน้าที่:** แก้ไขไดอารี่

#### `DELETE /diary/{id}`
**หน้าที่:** ลบไดอารี่

### **trends.py** - `/trends` (Dashboard Analytics)

#### `GET /trends/mood?period=week&offset=0`
**หน้าที่:** คำนวณ mood score เฉลี่ย
- period: "week" หรือ "month"
- offset: 0=ปัจจุบัน, -1=ย้อนหลัง 1 period

**Response:**
```json
{
  "average_score": 3.8,
  "trend": "up",  // up, down, stable
  "change": 0.5
}
```

#### `GET /trends/mood-factors?period=week&offset=0`
**หน้าที่:** หา mood tags ที่ปรากฏบ่อย (top 5 positive, top 5 negative)

**Response:**
```json
{
  "positive": [
    {"emoji": "😊", "count": 10},
    {"emoji": "💪", "count": 8}
  ],
  "negative": [
    {"emoji": "😔", "count": 3},
    {"emoji": "😰", "count": 2}
  ]
}
```

#### `GET /trends/completion?period=week&offset=0`
**หน้าที่:** คำนวณอัตราความสำเร็จของกิจกรรม

**Response:**
```json
{
  "rate": 75.5,
  "total": 20,
  "completed": 15,
  "breakdown": {
    "เสร็จแล้ว": 15,
    "กำลังทำ": 3,
    "ยังไม่เริ่ม": 2
  }
}
```

#### `GET /trends/life-balance?period=week&offset=0`
**หน้าที่:** แสดงสัดส่วนหมวดหมู่กิจกรรม

**Response:**
```json
{
  "categories": [
    {"name": "work", "count": 10, "percentage": 50},
    {"name": "health", "count": 5, "percentage": 25},
    {"name": "personal", "count": 5, "percentage": 25}
  ],
  "warnings": ["หมวดหมู่ work สูงเกินไป"]
}
```

#### `GET /trends/summary?period=week&offset=0`
**หน้าที่:** รวมข้อมูลทั้งหมดในคำขอเดียว

### **profile.py** - `/profile`

#### `GET /profile/me`
**หน้าที่:** ดึงข้อมูล user ที่ login อยู่

#### `PUT /profile/me`
**หน้าที่:** แก้ไขข้อมูล user (full_name, avatar_url)

---

# 📁 โครงสร้าง FRONTEND (React Native + Expo)

## 📂 `/frontend` - โฟลเดอร์หลัก

### **App.js** - จุดเริ่มต้นของ Frontend
**หน้าที่:**
- สร้าง Navigation Stack
- กำหนด screens ทั้งหมด
- ตรวจสอบ authentication (มี token หรือไม่)

**Navigation Structure:**
```
Stack Navigator
├── Login (หน้า login)
├── Register (หน้าสมัครสมาชิก)
└── Main (Tab Navigator)
    ├── Activities (รายการกิจกรรม)
    ├── Diary (บันทึกไดอารี่)
    ├── Trends (สถิติและแนวโน้ม)
    └── Profile (โปรไฟล์และแม่แบบ)
```

---

## 📂 `/frontend/src/api` - API Client

### **client.js** - Axios Configuration
**หน้าที่:**
- สร้าง axios instance
- ตั้งค่า base URL (http://10.0.2.2:8000 สำหรับ Android Emulator)
- เพิ่ม JWT token ใน Authorization header อัตโนมัติ
- จัดการ response และ error

**โค้ดสำคัญ:**
```javascript
const apiClient = axios.create({
  baseURL: 'http://10.0.2.2:8000'
});

// Interceptor: เพิ่ม token ทุก request
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: ดึง data จาก response.data
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => { throw error.response?.data || error.message; }
);
```

### **activities.js** - Activities API
```javascript
listActivities(qdate)                    // GET /activities?qdate=...
getActivity(id)                          // GET /activities/{id}
createActivity(data)                     // POST /activities
updateActivity(id, data)                 // PUT /activities/{id}
deleteActivity(id)                       // DELETE /activities/{id}
```

### **routines.js** - Routines API
```javascript
listRoutineActivities()                  // GET /routine-activities
createRoutineActivity(data)              // POST /routine-activities
updateRoutineActivity(id, data)          // PUT /routine-activities/{id}
deleteRoutineActivity(id)                // DELETE /routine-activities/{id}
```

**Normalization:**
- แปลง subtasks ให้อยู่ในรูปแบบ `[{id, text, completed}]`
- Filter subtasks ที่เป็นค่าว่างออก
- แปลงเวลาให้เป็น "HH:MM:SS"

### **diary.js** - Diary API
```javascript
listDiaryEntries(start_date, end_date)   // GET /diary?start_date=...
getDiaryEntry(id)                        // GET /diary/{id}
createDiaryEntry(data)                   // POST /diary
updateDiaryEntry(id, data)               // PUT /diary/{id}
deleteDiaryEntry(id)                     // DELETE /diary/{id}
```

### **trends.js** - Trends API
```javascript
getDashboardSummary(period, offset)      // GET /trends/summary?period=...
getMoodTrend(period, offset)             // GET /trends/mood?period=...
getMoodFactors(period, offset)           // GET /trends/mood-factors?period=...
getCompletionRate(period, offset)        // GET /trends/completion?period=...
getLifeBalance(period, offset)           // GET /trends/life-balance?period=...
```

### **auth.js** - Authentication API
```javascript
loginApi({email, password})              // POST /login/token
registerApi({email, password, full_name}) // POST /register
meApi()                                  // GET /profile/me
updateProfileApi(data)                   // PUT /profile/me
```

---

## 📂 `/frontend/src/screens` - หน้าจอต่างๆ

### **Login.js** - หน้า Login
**Flow:**
1. ผู้ใช้กรอก email + password
2. กดปุ่ม "เข้าสู่ระบบ"
3. เรียก `loginApi({email, password})`
4. ได้ token มา → เก็บใน AsyncStorage
5. Navigate ไปหน้า Main (Tab Navigator)

**การจัดการ Input:**
- Trim ช่องว่าง
- ลบตัวอักษรที่ไม่ใช่ ASCII ออกจาก email (แก้ปัญหาพิมพ์ผิด)

### **Register.js** - หน้าสมัครสมาชิก
**Flow:**
1. กรอก email, password, full_name
2. เรียก `registerApi()`
3. สมัครสำเร็จ → Navigate กลับไปหน้า Login

### **Activities.js** - รายการกิจกรรม
**หน้าที่:**
1. แสดงปฏิทินรายสัปดาห์ (จ-อา)
2. เลือกวันเพื่อดูกิจกรรมในวันนั้น
3. แสดงรายการกิจกรรม (จัดกลุ่มตาม routine_id)
4. กดเพื่อเปลี่ยนสถานะ หรือเข้าดูรายละเอียด

**State Management:**
```javascript
const [selectedDate, setSelectedDate] = useState(toDateString(new Date()))
const [activities, setActivities] = useState([])

// โหลดกิจกรรม
const loadActivities = async (date) => {
  const data = await listActivities(date);
  setActivities(data.items);
}

// เปลี่ยนสถานะ
const handleStatusChange = async (activityId, newStatus) => {
  await updateActivity(activityId, { status: newStatus });
  loadActivities(selectedDate);
}
```

**การจัดกลุ่ม:**
- กิจกรรมที่มาจาก routine เดียวกัน → แสดงเป็น group
- กิจกรรมปกติ → แสดงแยก

### **ActivityDetail.js** - รายละเอียดกิจกรรม
**หน้าที่:**
1. แสดงรายละเอียดกิจกรรม (title, date, time, category)
2. แสดงและแก้ไข notes (inline editing)
3. แสดงและติ๊ก subtasks
4. เปลี่ยนสถานะกิจกรรม

**การแก้ไข Notes:**
```javascript
const [editingNotes, setEditingNotes] = useState(false);
const [notesText, setNotesText] = useState("");

// กดไอคอนดินสอ → แสดง TextInput
// กดบันทึก → เรียก updateActivity
const handleSaveNotes = async () => {
  await updateActivity(id, { notes: notesText });
  setActivity({ ...activity, notes: notesText });
  setEditingNotes(false);
}
```

**การติ๊ก Subtask:**
```javascript
const toggleSubtask = async (subtaskId) => {
  const updatedSubtasks = activity.subtasks.map(st =>
    st.id === subtaskId ? { ...st, completed: !st.completed } : st
  );
  await updateActivity(id, { subtasks: updatedSubtasks });
  setActivity({ ...activity, subtasks: updatedSubtasks });
}
```

### **EditActivity.js** - สร้าง/แก้ไขกิจกรรม
**หน้าที่:**
1. กรอกข้อมูลกิจกรรม (title, category, date, time, notes)
2. เพิ่มงานย่อย (subtasks)
3. บันทึกกิจกรรม

**การจัดการ Subtasks:**
```javascript
const [subtasks, setSubtasks] = useState([]);

const addSubtask = () => {
  setSubtasks([...subtasks, { id: Date.now().toString(), text: '', completed: false }]);
}

const updateSubtask = (id, text) => {
  setSubtasks(subtasks.map(st => st.id === id ? { ...st, text } : st));
}

const removeSubtask = (id) => {
  setSubtasks(subtasks.filter(st => st.id !== id));
}
```

### **Diary.js** - รายการไดอารี่
**หน้าที่:**
1. แสดงปฏิทินรายเดือน
2. แสดงไดอารี่ทั้งหมดในเดือนนั้น
3. กดเพื่อดูรายละเอียด หรือสร้างใหม่

### **EditDiary.js** - สร้าง/แก้ไขไดอารี่
**หน้าที่:**
1. กรอกข้อมูลไดอารี่ (date, mood_score, mood_tags, summary)
2. เลือก mood tags จาก emoji picker
3. บันทึกไดอารี่

**Mood Tags:**
```javascript
const MOOD_TAGS = {
  positive: ["😊", "😁", "💪", "🎉", "❤️", "📚", "☕"],
  negative: ["😔", "😰", "😡", "😫", "😷", "💔"]
}

const toggleTag = (emoji) => {
  if (selectedTags.includes(emoji)) {
    setSelectedTags(selectedTags.filter(t => t !== emoji));
  } else {
    setSelectedTags([...selectedTags, emoji]);
  }
}
```

### **Trends.js** - Dashboard สถิติ
**หน้าที่:**
1. แสดง mood trend (คะแนนเฉลี่ย + แนวโน้ม)
2. แสดง mood factors (top 5 positive/negative tags)
3. แสดง completion rate (อัตราความสำเร็จ)
4. แสดง life balance (สัดส่วนหมวดหมู่)
5. สลับระหว่าง week/month
6. เลื่อนดูข้อมูลย้อนหลัง (offset -1, -2, ...)

**State Management:**
```javascript
const [period, setPeriod] = useState('week');  // 'week' หรือ 'month'
const [offset, setOffset] = useState(0);       // 0=ปัจจุบัน, -1=ย้อนหลัง
const [data, setData] = useState(null);

const loadData = async () => {
  const result = await getDashboardSummary(period, offset);
  setData(result);
}

// เปลี่ยน period
const handlePeriodChange = (newPeriod) => {
  setPeriod(newPeriod);
  setOffset(0);
}

// เลื่อนดูย้อนหลัง
const goToPrevious = () => setOffset(offset - 1);
const goToNext = () => setOffset(offset + 1);
```

### **Profile.js** - โปรไฟล์และแม่แบบ
**หน้าที่:**
1. แสดงข้อมูล user (full_name, email, avatar)
2. แสดงแม่แบบกิจกรรมทั้งหมด (จัดกลุ่มตามวัน)
3. สร้าง/แก้ไข/ลบแม่แบบ
4. Logout

**การจัดการแม่แบบ:**
```javascript
const [allRoutines, setAllRoutines] = useState([]);

const loadRoutines = async () => {
  const data = await listRoutineActivities();
  setAllRoutines(data);
}

// จัดกลุ่มตามวัน
const routinesByDay = {
  mon: allRoutines.filter(r => r.day_of_week === 'mon'),
  tue: allRoutines.filter(r => r.day_of_week === 'tue'),
  // ...
}
```

### **EditRoutine.js** - สร้าง/แก้ไขแม่แบบ
**หน้าที่:**
1. กรอกข้อมูลแม่แบบ (title, category, time, notes, subtasks)
2. บันทึกแม่แบบ
3. ลบแม่แบบ (ถ้าอยู่ในโหมดแก้ไข)

**การจัดการ Subtasks:**
```javascript
const [subtasks, setSubtasks] = useState(routine?.subtasks || []);

const addSubtask = () => {
  setSubtasks([...subtasks, { id: Date.now().toString(), text: '', completed: false }]);
}

const handleSave = async () => {
  const payload = {
    title: title.trim(),
    category,
    time: time ? `${time}:00` : null,
    notes: notes.trim() || null,
    subtasks: subtasks.length > 0 ? subtasks : null,
    day_of_week: currentDayKey
  };
  
  if (isEditMode) {
    await updateRoutineActivity(routine.id, payload);
  } else {
    await createRoutineActivity(payload);
  }
}
```

### **EditProfile.js** - แก้ไขโปรไฟล์
**หน้าที่:**
1. แก้ไข full_name
2. อัปโหลดรูป avatar
3. บันทึกข้อมูล

---

## 📂 `/frontend/src/components` - Components ที่ใช้ซ้ำ

### **TextInputField.js**
**หน้าที่:** Input field พร้อม label และ styling

### **DateTimeInput.js**
**หน้าที่:** Input สำหรับเลือกวันที่และเวลา

### **StatusPill.js**
**หน้าที่:** แสดง badge สถานะ (normal, urgent, done, cancelled)

---

## 📂 `/frontend/src/utils` - ฟังก์ชันช่วยเหลือ

### **constants.js** - ค่าคงที่
```javascript
STATUSES = {
  normal: { label: 'ยังไม่เริ่ม', color: '#595959', backgroundColor: '#f5f5f5' },
  urgent: { label: 'กำลังทำ', color: '#faad14', backgroundColor: '#fffbe6' },
  done: { label: 'เสร็จแล้ว', color: '#52c41a', backgroundColor: '#f6ffed' },
  cancelled: { label: 'ยกเลิก', color: '#ff4d4f', backgroundColor: '#fff1f0' }
}

CATEGORIES = [
  { name: 'work', label: 'งาน', emoji: '💼' },
  { name: 'personal', label: 'ส่วนตัว', emoji: '🏠' },
  { name: 'health', label: 'สุขภาพ', emoji: '💪' },
  { name: 'social', label: 'สังคม', emoji: '👥' },
  { name: 'learning', label: 'การเรียนรู้', emoji: '📚' },
  { name: 'finance', label: 'การเงิน', emoji: '💰' }
]

TH_DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
TH_DAYS_FULL = {
  sun: 'อาทิตย์', mon: 'จันทร์', tue: 'อังคาร', wed: 'พุธ',
  thu: 'พฤหัสบดี', fri: 'ศุกร์', sat: 'เสาร์'
}
```

### **dateUtils.js** - ฟังก์ชันจัดการวันที่
```javascript
// แปลง Date เป็น "YYYY-MM-DD"
toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// แปลง Date เป็น "HH:MM"
toTimeString(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// หาวันจันทร์ของสัปดาห์
getStartOfWeek(date) {
  const day = date.getDay(); // 0=อา, 1=จ, ..., 6=ส
  const diff = day === 0 ? -6 : -(day - 1); // จันทร์เป็นวันแรก
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return monday;
}

// แปลง day number เป็น day key
getDayKey(date) {
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return days[date.getDay()];
}
```

---

# 🔄 Data Flow - การไหลของข้อมูล

## 1️⃣ **Login Flow**
```
User กรอก email + password
  ↓
Login.js → loginApi({email, password})
  ↓
POST /login/token (backend)
  ↓
backend ตรวจสอบ user และ password
  ↓
backend สร้าง JWT token
  ↓
frontend เก็บ token ใน AsyncStorage
  ↓
Navigate ไปหน้า Main
```

## 2️⃣ **Create Activity from Routine Flow**
```
User เปิดหน้า Activities เลือกวัน 23 พ.ย.
  ↓
Activities.js → listActivities('2025-11-23')
  ↓
GET /activities?qdate=2025-11-23 (backend)
  ↓
backend logic:
  1. ดึง routines ของวันพุธ (wed)
  2. ดึง activities ที่มีอยู่แล้ววันที่ 23 พ.ย.
  3. เช็คว่า routine ไหนยังไม่ถูกสร้างเป็น activity
  4. สร้าง activities ใหม่ พร้อมคัดลอก notes + subtasks
  5. ส่งรายการ activities ทั้งหมดกลับไป
  ↓
frontend แสดงรายการกิจกรรม
```

## 3️⃣ **Edit Notes Flow**
```
User กดเข้าดูกิจกรรม
  ↓
ActivityDetail.js → getActivity(id)
  ↓
GET /activities/{id} (backend)
  ↓
แสดงรายละเอียด + notes
  ↓
User กดไอคอนดินสอ → แสดง TextInput
  ↓
User แก้ไข notes → กดบันทึก
  ↓
ActivityDetail.js → updateActivity(id, {notes: newNotes})
  ↓
PUT /activities/{id} (backend)
  ↓
backend อัปเดตฐานข้อมูล
  ↓
frontend อัปเดต state
```

## 4️⃣ **Toggle Subtask Flow**
```
User กดติ๊กถูกที่ subtask
  ↓
ActivityDetail.js → toggleSubtask(subtaskId)
  ↓
สร้าง updatedSubtasks (toggle completed)
  ↓
ActivityDetail.js → updateActivity(id, {subtasks: updatedSubtasks})
  ↓
PUT /activities/{id} (backend)
  ↓
backend อัปเดตฐานข้อมูล (JSONB field)
  ↓
frontend อัปเดต state
```

## 5️⃣ **Create Routine Template Flow**
```
User ไปหน้า Profile → เลือกวันจันทร์ → กด +
  ↓
Navigate ไป EditRoutine.js (create mode)
  ↓
User กรอก title, category, time, notes, subtasks
  ↓
กดบันทึก → createRoutineActivity(data)
  ↓
POST /routine-activities (backend)
  ↓
backend บันทึกแม่แบบลงฐานข้อมูล
  ↓
frontend กลับไปหน้า Profile
  ↓
Profile.js โหลดข้อมูลใหม่
```

## 6️⃣ **Delete Routine Flow**
```
User กดลบแม่แบบ
  ↓
EditRoutine.js → deleteRoutineActivity(id)
  ↓
DELETE /routine-activities/{id} (backend)
  ↓
backend logic:
  1. หา activities ที่สร้างจากแม่แบบนี้
  2. ตั้ง routine_id = NULL (กลายเป็นกิจกรรมปกติ)
  3. ลบแม่แบบ
  ↓
frontend กลับไปหน้า Profile
```

## 7️⃣ **View Trends Flow**
```
User เปิดหน้า Trends
  ↓
Trends.js → getDashboardSummary('week', 0)
  ↓
GET /trends/summary?period=week&offset=0 (backend)
  ↓
backend คำนวณ:
  - mood average (จาก diary_entries)
  - mood factors (top tags)
  - completion rate (จาก activities)
  - life balance (สัดส่วน categories)
  ↓
ส่งข้อมูลกลับไป
  ↓
frontend แสดงกราฟและสถิติ
```

---

# 🔐 Security & Authentication

## JWT Token Flow
```
1. User login → backend สร้าง JWT token
   Token = { sub: user_id, exp: expiration_time }
   
2. Frontend เก็บ token ใน AsyncStorage

3. ทุก API request → client.js เพิ่ม header:
   Authorization: Bearer <token>

4. Backend middleware (get_current_user):
   - ถอดรหัส token
   - ดึง user_id
   - ค้นหา user ในฐานข้อมูล
   - ส่ง user object ให้กับ router function

5. ถ้า token หมดอายุ → 403 Forbidden
   → Frontend redirect ไปหน้า Login
```

## Password Hashing
```
Register: password → bcrypt.hash() → hashed_password (เก็บใน DB)
Login: password + hashed_password → bcrypt.verify() → True/False
```

---

# 📊 Database Schema Summary

```sql
-- ตาราง users
users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  full_name VARCHAR,
  hashed_password VARCHAR,
  avatar_url VARCHAR,
  created_at TIMESTAMP
)

-- ตาราง routine_activities (แม่แบบ)
routine_activities (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  day_of_week VARCHAR(10),  -- mon, tue, wed, thu, fri, sat, sun
  title VARCHAR(255),
  category VARCHAR(100),
  time TIME,
  notes VARCHAR(2000),      -- เพิ่มใหม่
  subtasks JSONB            -- เพิ่มใหม่: [{id, text, completed}]
)

-- ตาราง activities (กิจกรรมจริง)
activities (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  routine_id UUID REFERENCES routine_activities(id) ON DELETE SET NULL,
  date DATE,
  title VARCHAR(255),
  category VARCHAR(100),
  time TIME,
  status VARCHAR(50),       -- normal, urgent, done, cancelled
  all_day BOOLEAN,
  notes VARCHAR(2000),
  subtasks JSONB,           -- [{id, text, completed}]
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- ตาราง diary_entries
diary_entries (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE,
  mood_score INTEGER,       -- 1-5
  mood_tags JSONB,          -- ["😊", "💪", "📚"]
  summary VARCHAR(5000),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(user_id, date)     -- 1 user = 1 diary ต่อวัน
)
```

---

# 🚀 การทำงานของระบบแบบ End-to-End

## สถานการณ์: User สร้างแม่แบบและใช้งานจริง

### ขั้นที่ 1: สร้างแม่แบบ
```
1. User เปิดแอป → Login
   - Frontend: Login.js → loginApi()
   - Backend: POST /login/token → ส่ง JWT token กลับ
   - Frontend: เก็บ token → Navigate ไป Main

2. User ไปหน้า Profile → เลือกวัน "จันทร์" → กด +
   - Navigate ไป EditRoutine.js (day_of_week = 'mon')

3. User กรอกข้อมูล:
   - title: "ออกกำลังกาย"
   - category: "health"
   - time: "06:00"
   - notes: "วิ่ง 5 กิโลเมตรที่สวนสาธารณะ"
   - subtasks:
     • "เตรียมชุดวิ่ง"
     • "วอร์มอัพร่างกาย"
     • "ยืดเหยียดหลังวิ่ง"

4. กดบันทึก
   - Frontend: EditRoutine.js → createRoutineActivity(data)
   - Backend: POST /routine-activities
   - DB: INSERT INTO routine_activities (...)
   - Frontend: กลับไปหน้า Profile → โชว์แม่แบบใหม่
```

### ขั้นที่ 2: กิจกรรมถูกสร้างอัตโนมัติ
```
5. วันจันทร์ถึง → User เปิดหน้า Activities
   - Frontend: Activities.js → listActivities('2025-11-25')
   - Backend: GET /activities?qdate=2025-11-25

6. Backend logic:
   - วันที่ 25 พ.ย. = วันจันทร์
   - query routine_activities WHERE day_of_week = 'mon'
   - ได้แม่แบบ "ออกกำลังกาย"
   - ตรวจสอบว่ายังไม่มี activity สำหรับแม่แบบนี้
   - สร้าง activity ใหม่:
     * คัดลอก title, category, time, notes
     * คัดลอก subtasks (สร้าง ID ใหม่, ตั้ง completed = false)
   - INSERT INTO activities (...)
   - ส่งรายการ activities กลับไป

7. Frontend แสดงกิจกรรม "ออกกำลังกาย"
   - มี 3 subtasks (ยังไม่ได้ติ๊ก)
   - สถานะ: "ยังไม่เริ่ม" (normal)
```

### ขั้นที่ 3: User ทำกิจกรรม
```
8. User กดเข้าไปดูรายละเอียดกิจกรรม
   - Navigate ไป ActivityDetail.js
   - โหลดข้อมูล: getActivity(id)
   - แสดง notes: "วิ่ง 5 กิโลเมตรที่สวนสาธารณะ"
   - แสดง subtasks: 3 รายการ

9. User ติ๊กถูก "เตรียมชุดวิ่ง"
   - Frontend: toggleSubtask(subtask_id)
   - อัปเดต subtasks array (completed = true)
   - Backend: PUT /activities/{id} {subtasks: [...]}
   - DB: UPDATE activities SET subtasks = '[...]'

10. User เปลี่ยนสถานะเป็น "กำลังทำ"
    - Frontend: handleStatusChange(id, 'urgent')
    - Backend: PUT /activities/{id} {status: 'urgent'}
    - UI: badge เปลี่ยนสี

11. User เสร็จแล้ว → เปลี่ยนสถานะเป็น "เสร็จแล้ว"
    - Frontend: handleStatusChange(id, 'done')
    - UI: badge เป็นสีเขียว
```

### ขั้นที่ 4: บันทึกไดอารี่
```
12. User ไปหน้า Diary → กดสร้างไดอารี่วันนี้
    - Navigate ไป EditDiary.js
    - กรอก:
      * mood_score: 4
      * mood_tags: ["😊", "💪", "🏃"]
      * summary: "วันนี้วิ่งได้ครบ 5 กม. รู้สึกสดชื่น"
    - กดบันทึก
    - Backend: POST /diary
    - DB: INSERT INTO diary_entries (...)
```

### ขั้นที่ 5: ดูสถิติ
```
13. User ไปหน้า Trends
    - Frontend: getDashboardSummary('week', 0)
    - Backend: คำนวณ:
      * Mood average: (4+3+5+4+3+4+4) / 7 = 3.86
      * Top mood tags: 💪 (5 ครั้ง), 😊 (4 ครั้ง)
      * Completion rate: 15/20 = 75%
      * Life balance: health (30%), work (50%), personal (20%)
    - Frontend: แสดงกราฟและสถิติ
```

---

# 🔧 ปัญหาที่พบและการแก้ไข

## ปัญหาที่ 1: Status Labels ไม่ตรงกัน
**อาการ:** Trends dashboard แสดงจำนวนกิจกรรมผิด  
**สาเหตุ:** Frontend ใช้ key "success", Backend ใช้ "done"  
**แก้ไข:** อัปเดต constants.js ให้ตรงกัน (normal, urgent, done, cancelled)

## ปัญหาที่ 2: Week Calculation ผิด
**อาการ:** สัปดาห์เริ่มต้นวันอาทิตย์แทนจันทร์  
**สาเหตุ:** getStartOfWeek() ใช้ Sunday as day 0  
**แก้ไข:** แก้ logic ให้ Monday เป็นวันแรกของสัปดาห์

## ปัญหาที่ 3: Foreign Key Error เมื่อลบ Routine
**อาการ:** ลบแม่แบบไม่ได้เพราะมี activities ที่อ้างอิง  
**แก้ไข:** ก่อนลบแม่แบบ ให้ SET routine_id = NULL ก่อน

## ปัญหาที่ 4: Login ผิดพลาดเพราะพิมพ์ตัวอักษรไทย
**อาการ:** Email validation error (THAI CHARACTER PHINTHU)  
**แก้ไข:** Trim และลบ non-ASCII characters ออกจาก email

## ปัญหาที่ 5: Notes และ Subtasks ไม่ถูกส่งไป Backend
**อาการ:** สร้างแม่แบบแล้ว notes/subtasks เป็น NULL  
**แก้ไข:** เพิ่ม notes และ subtasks ใน normalizeRoutinePayload()

---

# 📝 สรุป Key Concepts

## 1. **Routine Templates vs Activities**
- **Routine Template** = แม่แบบที่ซ้ำทุกสัปดาห์ (เก็บใน routine_activities)
- **Activity** = กิจกรรมจริงในแต่ละวัน (เก็บใน activities)
- เมื่อเปิดหน้า Activities → Backend จะ instantiate templates เป็น activities อัตโนมัติ

## 2. **Subtasks Structure**
```json
[
  {
    "id": "uuid-string",
    "text": "ชื่องานย่อย",
    "completed": false
  }
]
```
- เก็บเป็น JSONB ใน PostgreSQL
- Frontend update ทั้ง array เมื่อมีการเปลี่ยนแปลง

## 3. **JWT Authentication**
- Token เก็บใน AsyncStorage (persistent)
- Interceptor เพิ่ม header ทุก request อัตโนมัติ
- Backend verify token → get user → ส่งให้ router function

## 4. **Data Normalization**
- Frontend normalize payload ก่อนส่ง (เช่น เปลี่ยน HH:MM → HH:MM:SS)
- Backend validate ด้วย Pydantic schemas
- Response ผ่าน interceptor → ดึง response.data อัตโนมัติ

## 5. **State Management**
- ใช้ React useState และ useEffect
- โหลดข้อมูลเมื่อหน้าจอ focus (navigation.addListener)
- Local state update หลังจาก API call สำเร็จ

---

# 🎓 แนะนำสำหรับการพัฒนาต่อ

## 1. เพิ่ม Chart Visualization
- ใช้ react-native-chart-kit
- แทนที่ placeholders ใน Trends.js ด้วยกราฟจริง

## 2. Notification System
- แจ้งเตือนเมื่อถึงเวลาทำกิจกรรม
- ใช้ expo-notifications

## 3. Data Sync
- เพิ่ม loading states
- Optimistic updates
- Error handling ที่ดีขึ้น

## 4. Performance Optimization
- Pagination สำหรับรายการยาวๆ
- Memoization (React.memo, useMemo)
- Lazy loading

---

**เอกสารนี้สรุปการทำงานของระบบ Planary ทั้งหมด ตั้งแต่ Backend API, Database, Frontend Screens, และ Data Flow ครับ** 🚀
