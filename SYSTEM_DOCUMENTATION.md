# Planary - เอกสารระบบ

## 1. เครื่องมือที่ใช้พัฒนา (Development Tools & Technologies)

### Backend
- **Python 3.11+**
  - Framework: FastAPI - Modern, fast web framework สำหรับสร้าง RESTful API
  - ORM: SQLAlchemy - Object-Relational Mapping สำหรับจัดการฐานข้อมูล
  - Validation: Pydantic - Data validation และ serialization
  - Authentication: 
    - `python-jose[cryptography]` - JWT token generation/validation
    - `passlib[bcrypt]` - Password hashing
  - ASGI Server: Uvicorn - Production-grade ASGI server
  
- **Database**
  - PostgreSQL - Relational database management system
  - สนับสนุน JSONB สำหรับเก็บข้อมูลแบบ semi-structured (mood_tags, activities, subtasks)

- **Development Tools**
  - PowerShell - Script สำหรับรัน backend server
  - Environment Variables (.env) - การจัดการ configuration

### Frontend
- **React Native + Expo**
  - Framework: React Native - Cross-platform mobile app development
  - Platform: Expo SDK - Development platform และ toolchain
  - Navigation: 
    - `@react-navigation/native` - Navigation framework
    - `@react-navigation/native-stack` - Stack navigator
    - `@react-navigation/bottom-tabs` - Tab navigator
  
- **UI Components & Libraries**
  - `react-native-safe-area-context` - จัดการ safe area (notch, status bar)
  - `@expo/vector-icons` (Ionicons) - Icon library
  - `react-native-gesture-handler` - Gesture handling
  - `react-native-screens` - Native screen optimization

- **State Management & Storage**
  - `@react-native-async-storage/async-storage` - Local storage สำหรับเก็บ JWT token
  - React Hooks (useState, useEffect, useCallback, useMemo) - State management

- **HTTP Client**
  - `axios` - HTTP client สำหรับเรียก API

- **Development Tools**
  - Node.js & npm - Package management
  - Expo CLI - Development server และ build tools
  - Metro Bundler - JavaScript bundler

### DevOps & Deployment
- **Version Control**: Git (GitHub repository: belseris/PJ)
- **Development Environment**: 
  - Windows (PowerShell scripts)
  - VS Code (แนะนำ based on project structure)

---

## 2. Functional Requirements (ความต้องการเชิงหน้าที่)

### 2.1 ระบบผู้ใช้งาน (User Management)
#### FR-AUTH-001: การสมัครสมาชิก (Registration)
- ผู้ใช้สามารถสมัครสมาชิกด้วย email, username, gender, age, password
- ระบบต้องตรวจสอบ:
  - Email ต้องไม่ซ้ำในระบบ
  - Password ขั้นต่ำ 6 ตัวอักษร
  - Password และ confirm_password ต้องตรงกัน
  - Age อยู่ระหว่าง 1-120 ปี
- ระบบเข้ารหัสรหัสผ่านด้วย bcrypt ก่อนบันทึก

#### FR-AUTH-002: การเข้าสู่ระบบ (Login)
- ผู้ใช้เข้าสู่ระบบด้วย email และ password
- ระบบสร้าง JWT token หมดอายุใน 120 นาที (configurable)
- Frontend เก็บ token ใน AsyncStorage
- Token ถูกส่งใน Authorization header ทุกครั้งที่เรียก API

#### FR-USER-001: การจัดการโปรไฟล์ (Profile Management)
- ดูข้อมูลโปรไฟล์ (username, email, gender, age, avatar)
- แก้ไขข้อมูลโปรไฟล์ (username, gender, age)
- เปลี่ยนรหัสผ่าน (ต้องยืนยันรหัสผ่านเดิม)
- อัปโหลดรูปโปรไฟล์ (.png, .jpg, .jpeg, .webp)
  - ระบบสร้างชื่อไฟล์ด้วย UUID เพื่อไม่ให้ชื่อซ้ำ
  - เก็บไฟล์ใน `media/avatars/`

### 2.2 ระบบบันทึกไดอารี่ (Diary Management)
#### FR-DIARY-001: การสร้างบันทึก (Create Diary)
- สร้างบันทึกด้วย:
  - **ข้อมูลพื้นฐาน**: date, time, title, detail, tags
  - **2D Mood System**:
    - `mood_score`: คะแนน 1-5 ดาว หรือ 'good'/'bad' (legacy)
    - `mood_tags`: array ของ emoji tags (เช่น ['😊', '🚀', '💪'])
  - **รายการกิจกรรม**: activities (id, title, category, rating, activityMood)
- รองรับ 3 โหมด:
  1. **Manual Create**: สร้างบันทึกใหม่ด้วยมือ
  2. **Edit Existing**: แก้ไขบันทึกที่มีอยู่
  3. **Auto-Draft**: สร้างบันทึกพร้อมสรุปกิจกรรมอัตโนมัติ

#### FR-DIARY-002: การดูรายการบันทึก (List Diaries)
- แสดงรายการบันทึกทั้งหมด จัดกลุ่มตามวันที่
- Filter ตาม date range (start_date, end_date)
- เรียงตาม date และ time จากใหม่ไปเก่า
- แสดงข้อมูล: title, detail (snippet), mood_score (ดาว), mood_tags (emoji แรก)

#### FR-DIARY-003: Auto-Draft Creation
- **เมื่อเปิดแอป**: ระบบตรวจสอบว่ามีบันทึกของ "เมื่อวาน" หรือไม่
- **ถ้าไม่มี**: สร้างการ์ด "บันทึกร่าง" ปรากฏที่ด้านบน
- **เมื่อกดการ์ดร่าง**:
  1. ดึงกิจกรรมทั้งหมดของวันนั้น
  2. สร้างข้อความสรุปอัตโนมัติ (status, time, title)
  3. เติมใน detail field
  4. ผู้ใช้เพิ่ม mood และบันทึก

#### FR-DIARY-004: การแก้ไข/ลบบันทึก
- แก้ไขบันทึกได้ทุก field
- รองรับ partial update (แก้ไขเฉพาะ field ที่ส่งมา)
- ลบบันทึกได้ (soft delete ไม่มี แต่เป็น hard delete)

### 2.3 ระบบกิจกรรม (Activity Management)
#### FR-ACT-001: การสร้างกิจกรรม (Create Activity)
- สร้างกิจกรรมด้วย:
  - **พื้นฐาน**: date, title, category
  - **เวลา**: all_day (boolean), time (optional)
  - **สถานะ**: status (normal, urgent, done, cancelled)
  - **การแจ้งเตือน**: remind (boolean), remind_offset_min (default 5)
  - **รายละเอียด**: notes, subtasks (array ของ {title, done})

#### FR-ACT-002: การดูรายการกิจกรรม (List Activities)
- ดูกิจกรรมตามวันที่เลือก (Week Selector)
- จัดกลุ่มตาม category
- เรียงตามเวลา (all-day activities อยู่ท้ายสุด)
- แสดง status icon (✅ done, 🔥 urgent, ⚠️ cancelled, ⚪ normal)

#### FR-ACT-003: Auto-Instantiate Routine Activities
- **เมื่อเรียก GET /activities?qdate=...**: 
  1. ระบบหาว่าวันนั้นเป็นวันไหนในสัปดาห์ (mon-sun)
  2. ดึง RoutineActivities ทั้งหมดของวันนั้น
  3. ตรวจสอบว่าแม่แบบไหนยังไม่ถูกสร้างเป็น Activity จริง
  4. สร้าง Activity ใหม่จากแม่แบบอัตโนมัติ
  5. ส่งรายการกิจกรรมทั้งหมดกลับไป (เก่า + ใหม่)

#### FR-ACT-004: การแก้ไข/ลบกิจกรรม
- แก้ไขกิจกรรมได้ทุก field (ยกเว้น date)
- การแก้ไข Activity ที่มาจาก Routine จะไม่กระทบแม่แบบ
- ลบกิจกรรมได้ (วันพรุ่งนี้จะถูกสร้างใหม่จากแม่แบบ)

### 2.4 ระบบแม่แบบกิจกรรมประจำ (Routine Activity Management)
#### FR-ROUTINE-001: การสร้างแม่แบบ (Create Routine)
- สร้างแม่แบบกิจกรรมที่ทำซ้ำทุกสัปดาห์
- ระบุ: day_of_week (mon-sun), title, category, time
- ตัวอย่าง: "ออกกำลังกาย" ทุกวันจันทร์ เวลา 06:00

#### FR-ROUTINE-002: การจัดการแม่แบบ
- ดูรายการแม่แบบ (filter ตามวันได้)
- แก้ไขแม่แบบ
- ลบแม่แบบ (Activity ที่สร้างแล้วจะไม่ถูกลบ)

### 2.5 ระบบ Mood Tracking (2D Mood System)
#### FR-MOOD-001: การบันทึก Mood
- **Dimension 1 - Quantitative**: คะแนน 1-5 ดาว
  - 1-3 ดาว = 'bad'
  - 4-5 ดาว = 'good'
- **Dimension 2 - Qualitative**: เลือก emoji tags
  - Good tags: 😊 (สุขสมหวัง), 🚀 (มีประสิทธิผล), 💪 (แข็งแรง), 🙏 (ขอบคุณ), etc.
  - Bad tags: 😢 (เศร้า), 😰 (กังวล), 😫 (เหนื่อย), 😠 (โกรธ), etc.
  - Neutral tags: 😌 (สบายๆ), 🤔 (ครุ่นคิด), 😐 (เฉยๆ)

#### FR-MOOD-002: การแสดงผล Mood
- รายการบันทึก: แสดงดาว + emoji แรก
- หน้ารายละเอียด: แสดงดาวทั้งหมด + emoji tags ทั้งหมด

---

## 3. Non-Functional Requirements (ความต้องการเชิงคุณภาพ)

### 3.1 ประสิทธิภาพ (Performance)
#### NFR-PERF-001: Response Time
- API response time < 500ms สำหรับ request ทั่วไป
- Query ที่มี date range filter ใช้ database index ใน `date` field
- Pagination สำหรับรายการที่มีจำนวนมาก (limit/offset)

#### NFR-PERF-002: Database Optimization
- ใช้ Connection Pooling (`pool_pre_ping=True`)
- Index ใน fields ที่ query บ่อย:
  - `users.email` (unique + indexed)
  - `diaries.user_id, diaries.date`
  - `activities.user_id, activities.date`

#### NFR-PERF-003: Frontend Performance
- ใช้ `useCallback`, `useMemo` เพื่อลด re-render
- `SectionList` แทน `FlatList` สำหรับข้อมูลจำนวนมาก
- Lazy loading สำหรับรูปภาพ

### 3.2 ความปลอดภัย (Security)
#### NFR-SEC-001: Authentication & Authorization
- JWT token มี expiration time (default 120 นาที)
- Token ถูกเข้ารหัสด้วย HS256 algorithm
- ทุก protected endpoint ตรวจสอบ token ผ่าน `current_user` dependency

#### NFR-SEC-002: Password Security
- Password hashing ด้วย bcrypt (cost factor = default)
- Password ขั้นต่ำ 6 ตัวอักษร
- ไม่มีการ log หรือแสดง plain text password

#### NFR-SEC-003: Data Validation
- Backend validation ด้วย Pydantic schemas
- Frontend validation ก่อนส่ง request
- SQL injection protection ผ่าน SQLAlchemy ORM

#### NFR-SEC-004: CORS & API Security
- CORS ตั้งค่า `allow_origins=["*"]` (ควรจำกัดใน production)
- File upload จำกัดเฉพาะ image types (.png, .jpg, .jpeg, .webp)
- ใช้ UUID สำหรับ filename เพื่อป้องกัน path traversal

### 3.3 ความน่าเชื่อถือ (Reliability)
#### NFR-REL-001: Error Handling
- Custom error handler สำหรับ validation errors (422)
- Error messages เป็นภาษาไทยที่เข้าใจง่าย
- Frontend แสดง Alert เมื่อเกิด error

#### NFR-REL-002: Data Integrity
- Foreign key constraints:
  - `Diary.user_id` → `User.id` (CASCADE delete)
  - `Activity.user_id` → `User.id` (CASCADE delete)
  - `Activity.routine_id` → `RoutineActivity.id` (SET NULL)
- NOT NULL constraints ใน fields ที่จำเป็น
- Default values สำหรับ optional fields

#### NFR-REL-003: Transaction Management
- ใช้ database transactions (`db.commit()`)
- Rollback เมื่อเกิด error
- Connection pooling auto-reconnect

### 3.4 ความสามารถในการใช้งาน (Usability)
#### NFR-USE-001: User Interface
- **ภาษาไทย**: UI และ messages ทั้งหมดเป็นภาษาไทย
- **Responsive**: ปรับตาม safe area (notch, status bar)
- **Intuitive Navigation**: 
  - Tab Navigator สำหรับหน้าหลัก (Diary, Activities, Profile)
  - Stack Navigator สำหรับ sub-screens

#### NFR-USE-002: Feedback & Loading States
- แสดง ActivityIndicator ขณะโหลดข้อมูล
- Alert แจ้งเตือนเมื่อบันทึก/ลบสำเร็จ
- Disable ปุ่มขณะ submit เพื่อป้องกัน double-click

#### NFR-USE-003: Date & Time Handling
- รูปแบบวันที่: "14 พ.ย. 2024 (วันพฤหัสบดี)"
- Week Selector แสดงวันเป็นภาษาไทย (จ., อ., พ., etc.)
- Auto-fill time เป็น 00:00:00 ถ้าไม่ระบุ

### 3.5 ความสามารถในการบำรุงรักษา (Maintainability)
#### NFR-MAIN-001: Code Quality
- **ภาษาไทย**: Comments อธิบายโค้ดเป็นภาษาไทยทั้งหมด
- **Separation of Concerns**:
  - Backend: routers, schemas, models, core แยกชัดเจน
  - Frontend: screens, api, services, components, utils แยกชัดเจน
- **Naming Convention**: 
  - Python: snake_case
  - JavaScript: camelCase
  - Components: PascalCase

#### NFR-MAIN-002: Documentation
- API endpoints มี docstrings อธิบายหน้าที่
- Complex functions มี comments อธิบาย logic
- README สำหรับ backend และ frontend

#### NFR-MAIN-003: Configuration Management
- Environment variables ใน `.env` file
- Constants ใน `utils/constants.js` และ `core/config.py`
- ไม่ hard-code sensitive data

### 3.6 ความสามารถในการขยาย (Scalability)
#### NFR-SCALE-001: Database Design
- ใช้ UUID แทน auto-increment integer (distributed-friendly)
- JSONB สำหรับข้อมูล semi-structured (ขยายได้ง่าย)
- Normalized tables (users, diaries, activities, routine_activities)

#### NFR-SCALE-002: API Design
- RESTful API design
- Stateless (ใช้ JWT token, ไม่มี session)
- Pagination support (limit/offset)

#### NFR-SCALE-003: Frontend Architecture
- Component-based architecture
- Reusable components (TextInputField, DateTimeInput, StatusPill)
- Centralized API client (`apiClient.js`)

### 3.7 ความเข้ากันได้ (Compatibility)
#### NFR-COMP-001: Platform Support
- **Mobile**: iOS และ Android ผ่าน React Native + Expo
- **Backend**: รองรับ Windows (PowerShell scripts)
- **Database**: PostgreSQL 12+

#### NFR-COMP-002: Browser/Device Compatibility
- รองรับ React Native components ทั้งหมด
- Safe area handling สำหรับ devices ที่มี notch
- รองรับทั้ง portrait และ landscape (ถ้ามี)

### 3.8 ความพร้อมใช้งาน (Availability)
#### NFR-AVAIL-001: Uptime
- Backend server ควรมี uptime > 99% (ขึ้นกับ hosting)
- Database connection retry mechanism (`pool_pre_ping=True`)

#### NFR-AVAIL-002: Offline Capability
- Token เก็บใน local storage (ใช้งานได้โดยไม่ต้อง re-login)
- ในอนาคตอาจเพิ่ม offline mode (local cache)

---

## สรุป

### จุดเด่นของระบบ
1. **2D Mood System**: รองรับทั้งคะแนนเชิงปริมาณ (1-5) และคุณภาพ (emoji tags)
2. **Auto-Draft Creation**: สร้างบันทึกร่างอัตโนมัติพร้อมสรุปกิจกรรม
3. **Routine Activities**: จัดการกิจกรรมประจำและ instantiate อัตโนมัติ
4. **Security**: JWT authentication + bcrypt password hashing
5. **Thai Language**: UI และ documentation เป็นภาษาไทยทั้งหมด

### ข้อจำกัดและข้อควรพัฒนา
1. **CORS**: ควรจำกัด `allow_origins` ใน production
2. **Pagination**: เพิ่ม pagination ใน diary list
3. **Offline Mode**: เพิ่ม local cache สำหรับใช้งานแบบ offline
4. **Push Notifications**: เพิ่มการแจ้งเตือนสำหรับ activities
5. **Analytics**: เพิ่ม dashboard แสดงสถิติ mood และกิจกรรม
6. **Testing**: เพิ่ม unit tests และ integration tests
