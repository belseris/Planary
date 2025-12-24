# Planary

## Clone / Setup / Run (สำหรับ Demo)

ทำตามขั้นตอนนี้เพื่อให้ผู้ประเมินสามารถ clone และ run ระบบได้จริงบน Windows (ใช้ Postgres + Python + Expo):

### 1) Clone โค้ด

```bash
git clone <REPO_URL>
cd Planary
```

### 2) ตั้งค่า Database (PostgreSQL)

ต้องมี PostgreSQL ทำงานบนเครื่อง (แนะนำติดตั้งจาก https://www.postgresql.org/)

สร้างฐานข้อมูลว่างชื่อ `planary` และผู้ใช้ (ถ้ายังไม่มี):

```sql
-- เปิด psql แล้วรันคำสั่งด้านล่าง
CREATE USER planary_user WITH PASSWORD 'planary_pass';
CREATE DATABASE planary OWNER planary_user;
GRANT ALL PRIVILEGES ON DATABASE planary TO planary_user;
```

บันทึก host/port ของ Postgres (โดยปกติ `localhost:5432`).

### 3) ตั้งค่า Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate

# ติดตั้ง dependencies ตาม pyproject.toml
pip install -e .

# สร้างไฟล์ .env (ปรับค่าให้ตรงกับเครื่องคุณ)
New-Item -ItemType File -Path .env -Force
"DATABASE_URL=postgresql+psycopg2://planary_user:planary_pass@localhost:5432/planary`nSECRET_KEY=demo-secret-key`nACCESS_TOKEN_EXPIRE_MINUTES=120" | Set-Content .env

# รันเซิร์ฟเวอร์ FastAPI (0.0.0.0:8000)
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

ทดสอบว่า backend ทำงาน:

```bash
curl http://127.0.0.1:8000/ping
```

ถ้าต้องให้มือถือหรืออุปกรณ์ใน LAN เข้าถึง ให้ใช้ IP เครื่อง (เช่น `http://192.168.x.x:8000/ping`).
บน Windows สามารถเปิด firewall ชั่วคราวด้วยสคริปต์ (รัน PowerShell แบบ Administrator):

```powershell
cd backend
./allow_firewall.ps1 -Action Add   # เปิด
# ./allow_firewall.ps1 -Action Remove  # ปิดเมื่อทดสอบเสร็จ
```

### 4) ตั้งค่า Frontend (Expo)

```powershell
cd ..\frontend
npm install
```

แก้ค่า BASE_URL ใน `frontend/src/api/client.js` ให้ตรงกับ IP backend:

```js
// ตัวอย่าง
export const BASE_URL = 'http://192.168.x.x:8000';
```

เริ่มต้น Expo:

```bash
npx expo start
```

เปิดแอป Expo Go บนมือถือ (อยู่ Wi‑Fi เดียวกัน) แล้วสแกน QR เพื่อเปิดแอป

### 5) ตรวจสอบการทำงาน

- เปิด Swagger: `http://<IP>:8000/docs` เพื่อลองเรียก API
- ในแอป มือถือ: ลอง Register/Login จากหน้า `Login` และตรวจ `Activities`, `Diary`, `Trends`, `Profile`

### 6) หมายเหตุสำคัญสำหรับผู้ประเมิน

- ระบบต้องใช้ PostgreSQL จริง เนื่องจากมีฟิลด์ชนิด `JSONB` ในหลายตาราง
- ถ้า API ขึ้น 401 ให้ logout แล้ว login ใหม่ (token หมดอายุหรือไม่ถูกต้อง)
- ถ้าแอปขึ้น `Network Error` ให้ตรวจ IP/Firewall และว่าอยู่เครือข่ายเดียวกัน

## ภาพรวมสั้น ๆ
แอปวางแผนชีวิต/กิจกรรม (React Native + Expo) ต่อกับ backend FastAPI. ส่วนสำคัญคือปฏิทินเดือน (จุดสีฟ้า = กิจกรรมประจำวันจาก routine, จุดสีแดง = กิจกรรมอื่น) และการดึง/สร้างกิจกรรมอัตโนมัติจากแม่แบบประจำวัน (routine).

## สถาปัตยกรรม
- Backend: FastAPI + SQLAlchemy (`backend/`)
- Frontend: React Native/Expo (`frontend/`)
- DB: ใช้ SQLAlchemy models (เชื่อมต่อจาก `backend/db/session.py`)

## Backend (ไล่ไฟล์หลัก)
- `backend/main.py`: bootstrap FastAPI, รวม routers, CORS/security
- `backend/core/config.py`: ค่าคอนฟิก (env/DB/secret)
- `backend/core/security.py`: utility ด้าน security (hash/JWT ถ้ามี)
- `backend/db/session.py`: สร้าง SessionLocal, Base
- Models (`backend/models/`)
	- `activity.py`: กิจกรรมรายวัน (date, time/all_day, status, category, notes, subtasks JSONB, routine_id, user_id)
	- `routine_activity.py`: แม่แบบกิจกรรมประจำวัน (ใช้สร้าง activity อัตโนมัติ)
	- `diary.py`, `user.py`: บันทึกประจำวัน / ผู้ใช้
- Schemas (`backend/schemas/`)
	- `activities.py`: Pydantic create/update/out + parse subtasks JSON; ส่งออก routine_id
	- อื่น ๆ (diary/routine/user) ตามโดเมน
- Routers (`backend/routers/`)
	- `activities.py`:
		- `GET /activities?qdate=YYYY-MM-DD`: auto-instantiate routine ของวันนั้นถ้ายังไม่มี แล้วส่งรายการ
		- `GET /activities/month/{year}/{month}`: วนทุกวันในเดือน สร้างกิจกรรมจาก routine ที่ขาด แล้วคืนวันที่แยกเป็น `routine[]` (จุดฟ้า) และ `regular[]` (จุดแดง)
		- CRUD activity: create/get/update/delete
	- อื่น ๆ: `diary.py`, `routine_activities.py`, `login.py`, `register.py`, `profile.py`, `trends.py`, `home.py` ให้ REST สำหรับแต่ละฟีเจอร์
- Migrations: `migrations/001_add_mood_score_tags.sql` (ถ้ายังไม่ใช้ให้พิจารณาลบหรือ apply)
- Media: `backend/media/avatars/` สำหรับไฟล์รูปโปรไฟล์

## Frontend (ไล่ไฟล์หลัก)
- Entry/Config: `frontend/index.js`, `App.js`, `app.json`, `metro.config.js`
- API layer (`frontend/src/api/`)
	- `client.js`: Axios instance + token interceptor, BASE_URL จาก LAN IP (ปัจจุบัน `http://192.168.0.111:8000`)
	- `auth.js`: login/register/profile
	- `activities.js`: list/get/create/update/delete + `getMonthActivities` (สำหรับจุดปฏิทิน)
	- `diary.js`, `routines.js`, `trends.js`, `home.js` (ถ้ามี): เรียกแต่ละ router
	- `index.js`: re-export APIs
- Screens (`frontend/src/screens/`)
	- `Activities.js`: หน้าแสดงกิจกรรมรายวัน
		- state: `selectedDate`, `items`, `loading`, `calendarExpanded`
		- ถ้า calendarExpanded=true แสดงปฏิทินเดือน; false แสดง WeekSelector
		- เมื่อ `selectedDate` เปลี่ยน → `listActivities?qdate=...` → backend จะสร้างกิจกรรมจาก routine ให้เอง
		- group เป็น “กิจกรรมประจำวัน” (มี routine_id) และสถานะอื่น, SectionList แสดง, FAB calendar toggle, FAB + ไปสร้างกิจกรรม
	- อื่น ๆ (ตัวอย่าง): `Diary.js/EditDiary.js`, `Trends.js`, `Login.js`, `Register.js`, `Profile.js/EditProfile.js`, `EditActivity.js`, `ActivityDetail.js`, `EditRoutine.js` ทำงานตามโดเมน เรียก API ตรงกับชื่อไฟล์ใน `api/`
- Components (`frontend/src/components/`)
	- `MonthlyCalendar.js`: โหลด `/activities/month/{y}/{m}` แสดงจุดฟ้า (routine) แดง (regular); ใช้ ISO date string ป้องกัน timezone เลื่อนวัน; เลือกวันส่ง `YYYY-MM-DD` กลับไปตั้ง selectedDate
	- `DateTimeInput.js`, `TimePicker.js`, `TextInputField.js`, `StatusPill.js`, `MonthlyCalendar.js` ฯลฯ ช่วยเรื่อง UI/ฟอร์ม
- Utils/Constants (`frontend/src/utils/`)
	- `constants.js`: CATEGORIES, STATUSES, วันไทย
	- `dateUtils.js`: toDateString, toTimeString, getStartOfWeek (เริ่มจันทร์)
- Helpers
	- `moodSystem.js`: แปลง rating → tags (ใช้ใน EditDiary)
	- `summarizeActivities.js`: สรุปข้อความกิจกรรม (ใช้ใน EditDiary)
- Assets: `frontend/assets/` และ `frontend/src/assets/` (ภาพ/ไอคอนที่อ้างถึงใน screens/components)

## การไหลของข้อมูล (end-to-end)
1) Login → `auth.loginApi` → token เก็บใน AsyncStorage → Axios แนบ token ให้ทุก request
2) ปฏิทินเดือน → `getMonthActivities` → backend สร้างกิจกรรมจาก routine ทั้งเดือน (ถ้ายังไม่สร้าง) → จุดฟ้า/แดง แสดงใน MonthlyCalendar
3) เลือกวัน → `selectedDate` อัปเดต → `listActivities?qdate=...` → backend สร้าง routine ของวันนั้นถ้ายังไม่มี → ส่งรายการ → UI group routine vs. สถานะอื่น
4) แตะการ์ด → ActivityDetail; FAB + → EditActivity พร้อมวันที่
5) Diary/Trends/Profile → เรียก API ตามโดเมน แสดง/บันทึกข้อมูล

## หมายเหตุสำคัญ
- BASE_URL ใน `frontend/src/api/client.js` ต้องตรงกับ IP backend ที่เครื่องคุณ (ปัจจุบัน 192.168.0.111:8000)
- `/activities/month/{y}/{m}` สร้างกิจกรรมทั้งเดือน (โหลดหนักขึ้นถ้าข้อมูลเยอะ); ถ้าอยากให้เบาลง สามารถปรับให้ query เฉย ๆ ไม่ instantiate ได้
- ถ้าจะลบไฟล์ backend/routers ที่ไม่ใช้ ต้องเช็กการเรียกจาก frontend ก่อน

## สิ่งที่ถูกลบไปแล้ว (รอบก่อนหน้า)
- `frontend/src/autoDiaryService.js` (ไม่ถูกใช้งาน)

## อธิบายโค้ดแบบไฟล์ต่อไฟล์ (ละเอียด)

### Backend
- `backend/main.py` — สร้าง FastAPI app, ตั้ง CORS, mount `/media`, รวม routers ทั้งหมด, ลงทะเบียน handler 422
- `backend/core/config.py` — โหลดค่าจาก `.env` (DATABASE_URL, SECRET_KEY, ACCESS_TOKEN_EXPIRE_MINUTES), ตั้งค่า media dir
- `backend/core/security.py` — bcrypt hash/verify และสร้าง JWT (sub=user_id, exp จาก config)
- `backend/db/session.py` — สร้าง engine, SessionLocal, Base, helper `get_db()` + สร้างโฟลเดอร์ avatars ถ้ายังไม่มี
- Models (`backend/models/`)
	- `user.py` — ผู้ใช้ (UUID, email unique, username/gender/age/password_hash/avatar_url)
	- `activity.py` — กิจกรรมรายวัน (date/time/all_day/category/status/notes/remind/subtasks JSONB/routine_id/user_id)
	- `routine_activity.py` — แม่แบบกิจกรรมประจำวัน (day_of_week, time, notes, subtasks)
	- `diary.py` — ไดอารี่ (title/detail/date/time/mood legacy + mood_score/mood_tags/tags/activities JSONB)
- Schemas (`backend/schemas/`)
	- `activities.py` — Pydantic create/update/out + validator แปลง subtasks JSON; out มี routine_id
	- `routine_activity.py` — schema แม่แบบกิจกรรม (create/update/response)
	- `diary.py` — schema diary รองรับ mood_score int หรือ 'good'/'bad', mood_tags, activities[]
	- `login.py` / `register.py` / `profile.py` / `home.py` — payload/response สำหรับ auth, profile, home list
- Routers (`backend/routers/`)
	- `login.py` — POST `/login/token` ตรวจ bcrypt แล้วออก JWT
	- `register.py` — POST `/register` ตรวจ confirm_password, email unique, hash password
	- `profile.py` — `current_user` decode JWT; GET `/profile/me`; PUT `/profile/update`; PATCH `/profile/password`; POST `/profile/avatar` เซฟไฟล์ไป `media/avatars/`
	- `home.py` — GET `/home/diaries` (pagination + total); DELETE `/home/diaries/{id}`
	- `diary.py` — CRUD `/diary`; validate mood_score/mood/tags; partial update รองรับ activities list; default mood/time ป้องกัน null
	- `routine_activities.py` — CRUD แม่แบบ routine; default day_of_week ถ้าไม่ส่ง; ลบแล้ว set routine_id ของ activity เป็น NULL
	- `activities.py` — CRUD `/activities`; จุดสำคัญ: auto-instantiate routine เป็น Activity ใหม่เมื่อ
		- GET `/activities?qdate=YYYY-MM-DD` → สร้างกิจกรรมของวันนั้นที่ยังไม่มีตามแม่แบบ
		- GET `/activities/month/{y}/{m}` → วนทั้งเดือน สร้างกิจกรรมที่ขาด แล้วส่งวันที่ที่มี routine/regular แยก array
	- `trends.py` — สรุปข้อมูลสำหรับ dashboard (mood trend, mood factors, completion rate, life balance, summary รวม 4 ชุด)
- `backend/allow_firewall.ps1`, `run_backend.ps1`, `pyproject.toml`, `uv.lock` — helper/lock/config
- `migrations/001_add_mood_score_tags.sql` — สคริปต์เพิ่ม mood_score/mood_tags (ถ้ายังไม่ apply)

**ลำดับการทำงานหลัก (backend):**
1) Client ส่ง auth → `/login/token` → ได้ JWT → แนบใน Authorization ทุกคำขอ
2) Router ใดก็ตามดึง `me: User = Depends(current_user)` เพื่อตรวจ token แล้ว query User
3) CRUD ต่าง ๆ ใช้ session จาก `get_db()`; commit/refresh ทุกครั้งที่เขียน; models อิง Base จาก `session.py`
4) Activities: ทุกครั้งที่ดึงรายการวันหรือเดือน ระบบจะ generate จาก routine ก่อนแล้วจึงคืนผล ทำให้ UI เห็นกิจกรรมครบ
5) Trends: คำนวณ date range จาก period+offset, ดึง diaries/activities แล้วสรุปเป็นชุดข้อมูล chart-ready

### Frontend
- Root/Config
	- `App.js` — ต้นทาง React Native/Expo; ตรวจ token ใน AsyncStorage กำหนด initial route; เรียก `initAutoDiary()` หลัง login; สร้าง Stack + Bottom Tabs (กิจกรรม/บันทึก/แนวโน้ม/โปรไฟล์)
	- `index.js` — registerRootComponent สำหรับ Expo
	- `app.json`, `metro.config.js`, `assets/`, `.expo/`, `package.json`, `package-lock.json` — config/proj metadata
- API Layer (`frontend/src/api/`)
	- `client.js` — Axios instance, BASE_URL = `http://192.168.0.111:8000`, interceptor แนบ token และจับ 401
	- `auth.js` — login (axios ตรง), register, meApi (profile/me)
	- `activities.js` — list/get/create/update/delete + getMonthActivities สำหรับปฏิทิน
	- `diary.js` — list by date range/get/create/update/delete
	- `routines.js` — CRUD routine templates + normalizeRoutinePayload
	- `trends.js` — เรียก endpoints trends/* และ summary
	- `index.js` — re-export ทั้งหมด
- Components (`frontend/src/components/`)
	- `MonthlyCalendar.js` — ปฏิทินเดือน แสดงจุด routine(ฟ้า)/regular(แดง), เลือกวันส่ง ISO string, เปลี่ยนเดือนเรียก getMonthActivities
	- `DateTimeInput.js`, `TimePicker.js`, `TextInputField.js`, `StatusPill.js` — อินพุต/ป้ายสถานะที่ใช้ซ้ำ
- Utils/Services
	- `utils/constants.js` — CATEGORIES (emoji), STATUSES/STATUS_OPTIONS, TH day labels
	- `utils/dateUtils.js` — toDateString/toTimeString/getStartOfWeek (เริ่มวันจันทร์)
	- `autoDiaryService.js` — background สร้าง draft diary ย้อนหลัง 7 วัน (เรียกใน App.js); ใช้ listActivities+summaries
	- `summarizeActivities.js` — สรุปข้อความกิจกรรม (ใช้ใน autoDiary)
	- `moodSystem.js` — map rating → tags (ใช้ใน EditDiary)
- Screens (`frontend/src/screens/`)
	- `Login.js` / `Register.js` — ฟอร์ม auth; login เก็บ token, navigate Main; register ส่ง registerApi
	- `Activities.js` — ดึงกิจกรรมวัน (`/activities?qdate`) → backend สร้าง routine auto; toggle ปฏิทินเดือน/ตัวเลือกสัปดาห์; SectionList แยก “กิจกรรมประจำวัน” (routine_id) กับสถานะอื่น; FAB เปิดปฏิทิน/สร้างใหม่
	- `ActivityDetail.js` — แสดงกิจกรรม, toggle subtasks, เปลี่ยนสถานะ, edit notes; ถ้าเป็น routine_id จะซ่อนเมนูแก้/ลบ
	- `EditActivity.js` — สร้าง/แก้กิจกรรม (ไม่มี repeat_config); จัดการ subtasks, all_day/time, category/status
	- `Diary.js` / `EditDiary.js` — รายการไดอารี่ + ฟอร์มสร้าง/แก้, mood_score/tags, ผูก activities summary
	- `Trends.js` — เรียก trends/summary แสดง charts (mood trend, factors, completion, balance)
	- `Profile.js` / `EditProfile.js` — ดู/แก้โปรไฟล์, เปลี่ยนรหัสผ่าน, อัปโหลด avatar
	- `EditRoutine.js` — CRUD routine templates (day_of_week/time/subtasks) เรียก API routines
	- `ActivityDetail.js`, `EditActivity.js` ใช้ `STATUSES` เพื่อจัดการสถานะตรงกับ backend

**ลำดับการทำงานหลัก (frontend):**
1) เปิดแอป → `App.js` ตรวจ token → ถ้ามี เรียก `initAutoDiary()` สร้าง draft diary ย้อนหลัง
2) `Activities` เลือกวัน → `listActivities` → backend auto-instantiate routines → UI จัดกลุ่ม routine vs สถานะอื่น, การ์ดกดดู detail
3) `MonthlyCalendar` เรียก `getMonthActivities` เพื่อแสดงจุดวัน routine/regular แล้วเลือกวันส่งกลับ Activities
4) `Diary`/`EditDiary` ใช้ `listDiaries` และ `create/updateDiary`; mood_score รองรับตัวเลขหรือ good/bad, tags เป็น emoji list
5) `Trends` เรียก `getDashboardSummary` (หรือแยก endpoint) เพื่อแสดง mood trend, mood factors, completion, life balance
6) `Profile` เรียก `meApi`; `EditProfile` PUT update; เปลี่ยนรหัสผ่าน PATCH; อัปโหลด avatar POST multipart
7) `EditRoutine` ใช้ normalizeRoutinePayload จัด payload ให้ตรง schema ก่อนส่งสร้าง/อัปเดตแม่แบบ

## แผนที่ไฟล์แบบละเอียด (ทีละโฟลเดอร์)

### Backend
- ราก `backend/`
	- `main.py` — สร้าง FastAPI app, mount media, include routers, CORS, handler 422
	- `pyproject.toml` / `uv.lock` — dependency/lock
	- `run_backend.ps1` / `allow_firewall.ps1` — สคริปต์ช่วยรัน/เปิด firewall
	- `media/avatars/` — ที่เก็บไฟล์รูปโปรไฟล์ (ถูก mount ที่ `/media`)
	- `migrations/001_add_mood_score_tags.sql` — สคริปต์เพิ่มฟิลด์ mood_score/tags
- `backend/core/`
	- `config.py` — อ่าน .env, ตั้ง DATABASE_URL, SECRET_KEY, token expire, media dir
	- `security.py` — bcrypt hash/verify, JWT encode (sub=user_id, exp)
- `backend/db/`
	- `session.py` — create_engine + SessionLocal + Base + get_db(); สร้างโฟลเดอร์ avatars
- `backend/models/`
	- `user.py` — users table (email unique, username/gender/age/password_hash/avatar_url)
	- `activity.py` — activities table (date/time/all_day/status/category/notes/remind/subtasks JSONB/routine_id/user_id)
	- `routine_activity.py` — routine_activities table (day_of_week/time/notes/subtasks/user_id)
	- `diary.py` — diaries table (title/detail/date/time/mood legacy/mood_score/mood_tags/tags/activities JSONB)
- `backend/schemas/`
	- `activities.py` — Pydantic create/update/out + subtasks validator + routine_id ใน response
	- `routine_activity.py` — schema create/update/response ของ routine template
	- `diary.py` — schema diary รองรับ mood_score int|'good'|'bad', mood_tags list, activities feedback list
	- `login.py` — LoginRequest + TokenResponse (bearer)
	- `register.py` — RegisterRequest/Response
	- `profile.py` — ProfileMe/Update/PasswordChange
	- `home.py` — DiaryItem/ListResponse (pagination)
- `backend/routers/`
	- `login.py` — POST `/login/token` ตรวจ bcrypt แล้วออก JWT
	- `register.py` — POST `/register` ตรวจ confirm/email ซ้ำ Hash password
	- `profile.py` — `current_user` decode JWT; GET me; PUT update profile; PATCH password; POST avatar upload
	- `home.py` — GET `/home/diaries` (limit/offset + total); DELETE `/home/diaries/{id}`
	- `diary.py` — CRUD `/diary` + validate mood_score/mood/tags + partial update + default mood/time
	- `routine_activities.py` — CRUD routine templates; default day_of_week; delete → nullify routine_id in activities
	- `activities.py` — CRUD `/activities`; auto-instantiate routine on GET day/month; month endpointแยก routine/regular dates
	- `trends.py` — `/trends/mood|mood-factors|completion|life-balance|summary`; คำนวณช่วงเวลา + สรุป chart-ready

### Frontend
- ราก `frontend/`
	- `App.js` — Entry; ตรวจ token; initAutoDiary; Stack + Bottom Tabs (กิจกรรม/บันทึก/แนวโน้ม/โปรไฟล์)
	- `index.js` — registerRootComponent (Expo)
	- `app.json`, `metro.config.js`, `.expo/`, `assets/` — config/ทรัพยากร
- `frontend/src/api/`
	- `client.js` — Axios instance, BASE_URL (`http://192.168.0.111:8000`), interceptors token+401
	- `auth.js` — login (axios ตรง), register, meApi
	- `activities.js` — list/get/create/update/delete, getMonthActivities
	- `diary.js` — list by date range, get/create/update/delete diary
	- `routines.js` — CRUD routine templates + normalizeRoutinePayload helper
	- `trends.js` — เรียก trends endpoints + summary
	- `index.js` — re-export APIs
- `frontend/src/components/`
	- `MonthlyCalendar.js` — ปฏิทินเดือน จุดฟ้า routine/แดง regular, เลือกวัน, เปลี่ยนเดือนโหลดใหม่
	- `DateTimeInput.js`, `TimePicker.js`, `TextInputField.js`, `StatusPill.js` — อินพุต/UI ย่อย
- `frontend/src/screens/`
	- `Activities.js` — แสดงกิจกรรมวัน, toggle ปฏิทิน/สัปดาห์, auto-instantiate routines, SectionList กลุ่ม routine vs สถานะอื่น
	- `ActivityDetail.js` — ดูกิจกรรม, เปลี่ยนสถานะ, toggle subtasks, edit notes; ถ้า routine_id ซ่อนเมนูแก้/ลบ
	- `EditActivity.js` — สร้าง/แก้กิจกรรม; จัดการ subtasks; all_day/time/category/status (ไม่มี repeat_config)
	- `Diary.js` / `EditDiary.js` — รายการ/แก้ไดอารี่; mood_score/tag; ผูก activities summary
	- `Trends.js` — เรียก trends summary แสดงกราฟ (mood/factors/completion/balance)
	- `Profile.js` / `EditProfile.js` — ดู/แก้โปรไฟล์, เปลี่ยนรหัสผ่าน, อัปโหลด avatar
	- `EditRoutine.js` — CRUD routine template (day_of_week/time/subtasks)
- `frontend/src/utils/`
	- `constants.js` — CATEGORIES, STATUSES(+OPTIONS), ป้ายวันไทย
	- `dateUtils.js` — toDateString/toTimeString/getStartOfWeek
- `frontend/src/` services & helpers
	- `autoDiaryService.js` — สร้าง draft diary ย้อนหลัง 7 วัน (เรียก listActivities + summarize)
	- `summarizeActivities.js` — สรุปข้อความกิจกรรม (ใช้ใน autoDiary)
	- `moodSystem.js` — map rating → tags (ใช้ใน EditDiary)

## วิธีการเขียน/ขยายโค้ด (ขั้นตอนสั้น ๆ)

### เพิ่ม API ใหม่ (Backend)
1) ถ้าต้องมีตารางใหม่ → สร้าง model ใน `backend/models/xxx.py` + import model เข้า `backend/main.py` หรือไฟล์ที่มี Base.metadata.create_all แล้ว เพื่อให้สร้างตาราง
2) สร้าง schema ใน `backend/schemas/xxx.py` (Create/Update/Response) ใช้ `from_attributes = True` ใน response
3) เขียน router ใน `backend/routers/xxx.py` (ใช้ `APIRouter(prefix="/xxx")`) และ include ใน `main.py`
4) ใช้ `Depends(get_db)` สำหรับ session, `Depends(current_user)` เพื่อตรวจ JWT ทุก endpoint ที่ต้องล็อกอิน
5) Commit/refresh ทุกครั้งที่บันทึก (`db.add(row); db.commit(); db.refresh(row)`) และ validate payload ด้วย Pydantic schema
6) ถ้าต้อง expose file → mount static หรือเก็บ path ลง field (เหมือน avatar)

### เพิ่มหน้าจอ/ฟีเจอร์ใหม่ (Frontend)
1) API layer: เพิ่มฟังก์ชันใน `frontend/src/api/xxx.js` แล้ว export ผ่าน `index.js`; ถ้ามี endpoint ใหม่ให้ตั้ง URL ตาม backend
2) ถ้าต้อง auth ให้ใช้ `apiClient` (จะติด token ให้อัตโนมัติ); ถ้า login/register ใช้ axios ตรงเหมือน `auth.js`
3) UI: สร้าง screen ใน `frontend/src/screens/` แล้วเพิ่ม route ใน `App.js` (Stack) หรือ Tab ถ้าต้องการแสดงใน bottom tabs
4) ถ้าต้องใช้ปฏิทิน/รายการกิจกรรม ให้ reuse components เช่น `MonthlyCalendar`, constants ใน `utils/constants`, helper เวลาใน `utils/dateUtils`
5) จัด state → call API ใน `useEffect` / `useCallback` และรองรับ loading/error; ใช้ `Alert` แจ้ง error
6) ถ้าต้องส่งเวลาจาก TimePicker ให้แปลงเป็น `HH:MM:SS` หรือส่ง `null` เมื่อ all_day

### แก้/เพิ่ม routine & activities
- เพิ่มแม่แบบ: ใช้ `createRoutineActivity` (ต้องมี `title`, `day_of_week`) แล้ว backend จะ instantiate กิจกรรมอัตโนมัติเมื่อเรียก `/activities` หรือ `/activities/month`
- เปลี่ยนสถานะกิจกรรม: ใช้ `updateActivity(id, { status })` (ดูตัวเลือกใน `STATUSES`)
- ลบกิจกรรมที่มาจาก routine: ลบได้ แต่วันถัดไประบบจะสร้างใหม่ตามแม่แบบ

### Notes การตั้งค่า/รัน
- BASE_URL อยู่ที่ `frontend/src/api/client.js` → ต้องเปลี่ยน IP ให้ตรงเครื่องรัน backend (`ipconfig | findstr "IPv4"`)
- รัน backend: ในโฟลเดอร์ `backend` ใช้ `python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload`
- รัน frontend (Expo): ในโฟลเดอร์ `frontend` ใช้ `npx expo start`
- ถ้าเพิ่มไฟล์ .env ให้ตรงกับ `core/config.py` (DATABASE_URL, SECRET_KEY, ACCESS_TOKEN_EXPIRE_MINUTES)

## เริ่มต้นรัน/แก้โค้ด (มือใหม่ ทำตามได้ทีละก้าว)

### 0) ติดตั้งของจำเป็น
- Python 3.11+, Node.js (npm), Git, และ Postgres (ถ้าใช้ DB จริง)

### 1) ตั้งค่า Backend
1. สร้างไฟล์ `.env` ใน `backend/` (ปรับค่าจริง):
	```
	DATABASE_URL=postgresql+psycopg2://<user>:<pass>@localhost:5432/planary
	SECRET_KEY=some-secret-string
	ACCESS_TOKEN_EXPIRE_MINUTES=120
	```
2. สร้าง venv และติดตั้งแพ็กเกจ:
	```
	cd backend
	python -m venv .venv
	.\.venv\Scripts\activate
	pip install -r requirements.txt  # หรือ pip install -e . ถ้ามี pyproject
	```
3. รันเซิร์ฟเวอร์ (ต้องมี Postgres ทำงานและ DATABASE_URL ถูกต้อง):
	```
	python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
	```

### 2) ตั้งค่า Frontend (Expo)
1. ปรับ BASE_URL ใน `frontend/src/api/client.js` ให้เป็น IP เครื่องที่รัน backend (ดูจาก `ipconfig | findstr "IPv4"`):
	```js
	const DEFAULT_LAN_IP = '192.168.x.x';
	export const BASE_URL = `http://${DEFAULT_LAN_IP}:8000`;
	```
2. ติดตั้ง dependencies และรัน Expo:
	```
	cd ../frontend
	npm install
	npx expo start
	```
3. เปิด Expo Go บนมือถือ (ต้องอยู่ Wi‑Fi เดียวกัน) สแกน QR แล้วลองล็อกอิน/สมัครสมาชิก

### 3) แก้โค้ด backend แบบง่าย
- เพิ่ม endpoint ใหม่: สร้างไฟล์ใน `backend/routers/xxx.py`, สร้าง schema ใน `backend/schemas/xxx.py`, รวม router ใน `main.py`
- เพิ่มคอลัมน์ใหม่: แก้ `backend/models/xxx.py` + schema + (ถ้าจำเป็น) migration แล้วรันใหม่
- ทดสอบ API ที่ Swagger: `http://<IP>:8000/docs`

### 4) แก้โค้ด frontend แบบง่าย
- เรียก API ใหม่: เพิ่มฟังก์ชันใน `frontend/src/api/xxx.js` แล้วใช้ในไฟล์ screen/component ที่เกี่ยวข้อง
- แก้ UI: ปรับไฟล์ที่ `frontend/src/screens/` หรือ `frontend/src/components/`
- ส่งเวลาจาก TimePicker: ใช้รูปแบบ `HH:MM:SS` หรือส่ง `null` ถ้า all_day

### 5) ตัวอย่างเล็ก ๆ เพื่อเริ่ม
- เปลี่ยนชื่อ tab: แก้ `Tab.Screen name="กิจกรรม"` ใน `App.js`
- เพิ่มปุ่มโหลดกิจกรรม: ใน `Activities.js` เพิ่มปุ่มที่เรียก `listActivities({ qdate })` แล้ว set state
- เพิ่มฟิลด์ notes ให้ routine: แก้ model+schema routine, migrate DB, แล้วปรับ `frontend/src/api/routines.js` ให้ส่ง/รับ `notes`

### 6) เช็กปัญหาทั่วไป
- 401: ลบ token ในแอป (logout/clear AsyncStorage) แล้ว login ใหม่
- API ไม่ตอบ: ตรวจ IP/port ใน BASE_URL และให้มือถือกับเครื่อง dev อยู่เครือข่ายเดียวกัน
- Backend ไม่รัน: ตรวจข้อความ error ในเทอร์มินัล (มักเป็น DB ต่อไม่ได้ หรือ .env หาย)

## Code Walkthrough รายไฟล์ (ลงลึกตามโค้ดหลัก)

### Backend — Routers (ธุรกิจหลัก)
- `routers/activities.py`
	- `get_month_activities(year, month)`: วนทุกวันในเดือน, instantiate routine ที่ขาด → commit → แยกวัน routine/regular ส่งกลับ
	- `list_activities(qdate)`: parse วันที่ → หา routine ของวัน → สร้าง Activity ที่ยังไม่มี (คัดลอก subtasks พร้อมรีเซ็ต completed) → คืน ActivityList (sort by time)
	- CRUD: `create_activity`, `get_activity`, `update_activity` (validate payload, block date update), `delete_activity`
- `routers/routine_activities.py`
	- `list_routines(day_of_week?)`: กรองตามวัน, order by time
	- `create_routine`: default day_of_week ถ้าไม่ส่ง → create row
	- `update_routine`: partial update
	- `delete_routine`: ตั้ง routine_id ของกิจกรรมที่เกี่ยวข้องเป็น NULL ก่อนลบแม่แบบ
- `routers/diary.py`
	- `list_diaries(start_date/end_date)`: filter + sort desc
	- `create_diary`: validate mood_score (int 1..5 หรือ 'good'/'bad'), set default time=00:00:00, default mood="😌", แปลง activities -> list
	- `update_diary`: partial, validate mood_score/mood, แปลง activities
	- `delete_diary`: ลบตาม id/user
- `routers/login.py`: ตรวจ email/password (bcrypt verify) → ออก JWT ด้วย `create_access_token`
- `routers/register.py`: เช็กรหัสผ่านตรงกัน, email ไม่ซ้ำ, hash แล้วบันทึก
- `routers/profile.py`: `current_user` decode JWT → ใช้เป็น Depends; GET me; PUT update profile; PATCH password (verify old, hash new); POST avatar (ตรวจ ext, gen uuid filename, เซฟ `media/avatars`, set `avatar_url`)
- `routers/home.py`: GET `/home/diaries` (limit/offset + total), DELETE ซ้ำกับ diary เพื่อ compat
- `routers/trends.py`
	- `get_mood_trend`: range by period/offset, แปลง mood_score → ตัวเลข, avg + trend (first/second half)
	- `get_mood_factors`: นับ emoji tags ตามกลุ่มคะแนน (>=4, <=2, อื่น) top 5
	- `get_completion_rate`: นับสถานะกิจกรรม, completion_rate, คืน data สำหรับ donut
	- `get_life_balance`: นับ category → % → warning ถ้าเกิน 60% หรือ health <10% (total>=10)
	- `get_dashboard_summary`: bundle 4 ฟังก์ชันข้างต้น

### Backend — Schemas/Models/Core
- `models/*.py`: SQLAlchemy models (User/Activity/RoutineActivity/Diary) พร้อม UUID PK, JSONB fields สำหรับ subtasks/mood_tags/activities, timestamps
- `schemas/activities.py`: ActivityCreate/Update validators แปลง subtasks จาก string/json, ActivityOut มี routine_id
- `schemas/routine_activity.py`: Base/Create/Update/Response สำหรับแม่แบบ routine
- `schemas/diary.py`: DiaryCreate/Update/Response รองรับ mood_score int|string, mood_tags list, activities feedback list
- `schemas/login.py`, `register.py`, `profile.py`, `home.py`: payload/response ตามชื่อ
- `core/config.py`: Settings จาก .env, media dir
- `core/security.py`: bcrypt hash/verify, JWT encode (sub, exp)
- `db/session.py`: engine, SessionLocal, Base, get_db(), สร้างโฟลเดอร์ avatars

### Frontend — API Layer
- `src/api/client.js`: Axios instance, BASE_URL, interceptors แนบ token + จับ 401 → Alert แล้วลบ token
- `src/api/activities.js`: list/get/create/update/delete, `getMonthActivities`
- `src/api/auth.js`: `loginApi` (axios ตรง), `registerApi` (normalize age/confirm), `meApi`
- `src/api/diary.js`: list by range, CRUD diary
- `src/api/routines.js`: CRUD routine + `normalizeRoutinePayload` (จัด day_of_week/time/subtasks)
- `src/api/trends.js`: เรียก trends endpoints + summary

### Frontend — Components/Screens (โค้ดหลัก)
- `components/MonthlyCalendar.js`: useEffect โหลด `/activities/month`; คำนวณกริดวัน; แสดงจุด routine/regular; onDateSelect ส่ง ISO `YYYY-MM-DD`
- `screens/Activities.js`: state selectedDate/items; loadActivities -> `listActivities?qdate`; grouped by routine_id vs status; toggle เดือน/สัปดาห์; FAB calendar + add
- `screens/ActivityDetail.js`: โหลดกิจกรรม, ถ้า routine_id ซ่อนเมนูแก้/ลบ; เปลี่ยนสถานะ (updateActivity); toggle subtasks; edit notes
- `screens/EditActivity.js`: form create/update; normalize subtasks; ส่ง time เป็น `HH:MM:SS` หรือ null ถ้า all_day; update omit date
- `screens/Diary.js` / `EditDiary.js`: ใช้ `listDiaries` / `create|updateDiary`; mood_score/tags; ผูก activities summary (autoDiary)
- `screens/Trends.js`: เรียก `getDashboardSummary` แสดงกราฟ (ตาม constants สี/label ใน frontend)
- `screens/Profile.js` / `EditProfile.js`: meApi, update profile, change password, upload avatar
- `screens/EditRoutine.js`: CRUD routine templates ใช้ normalizeRoutinePayload
- `App.js`: ตรวจ token จาก AsyncStorage → set initial route; เรียก `initAutoDiary()` หลังมี token; สร้าง Stack + Bottom Tabs
