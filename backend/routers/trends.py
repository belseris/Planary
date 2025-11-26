"""
trends.py - API Endpoints สำหรับหน้า Dashboard/Trends

หน้าที่หลัก:
- GET /trends/mood - แนวโน้มอารมณ์ (Mood Trend Line Chart)
- GET /trends/mood-factors - ปัจจัยที่ส่งผลต่ออารมณ์ (Mood Tags Analysis)
- GET /trends/completion - สรุปความสำเร็จของกิจกรรม (Completion Rate)
- GET /trends/life-balance - สมดุลชีวิตตามหมวดหมู่ (Category Distribution)

Query Parameters:
- period: 'week' | 'month' | 'year' (default: 'week')

Data Flow:
1. คำนวณ date range จาก period ที่เลือก
2. Query ข้อมูลจาก diaries และ activities
3. ประมวลผลและส่งกลับในรูปแบบที่พร้อมใช้กับ charts
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from db.session import get_db
from models.diary import Diary
from models.activity import Activity
from models.user import User
from routers.profile import current_user
from datetime import datetime, timedelta
from typing import Literal
from collections import Counter

router = APIRouter(prefix="/trends", tags=["trends"])


def get_date_range(period: str, offset: int = 0):
    """
    คำนวณ start_date และ end_date จาก period และ offset
    
    Args:
        period: 'week' | 'month' | 'year'
        offset: จำนวนช่วงที่ต้องการย้อนกลับ (0 = ปัจจุบัน, -1 = ก่อนหน้า 1 ช่วง, -2 = ก่อนหน้า 2 ช่วง)
    
    Returns:
        tuple: (start_date, end_date) ในรูปแบบ date object
    
    ตัวอย่าง (วันนี้ = 23 พ.ย. 2568 = วันเสาร์):
        period='week', offset=0  → 18-24 พ.ย. (สัปดาห์นี้: จันทร์-อาทิตย์)
        period='week', offset=-1 → 11-17 พ.ย. (สัปดาห์ที่แล้ว)
        period='month', offset=0 → 1-30 พ.ย. (เดือนนี้)
        period='month', offset=-1 → 1-31 ต.ค. (เดือนที่แล้ว)
    """
    today = datetime.now().date()
    
    if period == 'week':
        # คำนวณสัปดาห์ตาม offset (0 = สัปดาห์นี้, -1 = สัปดาห์ที่แล้ว)
        start = today - timedelta(days=today.weekday()) + timedelta(weeks=offset)
        end = start + timedelta(days=6)
    elif period == 'month':
        # คำนวณเดือนตาม offset (0 = เดือนนี้, -1 = เดือนที่แล้ว)
        target_month = today.month + offset
        target_year = today.year
        
        # ปรับ year ถ้า month ติดลบหรือเกิน 12
        while target_month < 1:
            target_month += 12
            target_year -= 1
        while target_month > 12:
            target_month -= 12
            target_year += 1
        
        # วันแรกของเดือน
        start = datetime(target_year, target_month, 1).date()
        
        # วันสุดท้ายของเดือน
        if target_month == 12:
            end = datetime(target_year, 12, 31).date()
        else:
            end = (datetime(target_year, target_month + 1, 1) - timedelta(days=1)).date()
    else:  # year (เก็บไว้เผื่ออนาคต)
        # ปีนี้ + offset (0 = ปีนี้, -1 = ปีที่แล้ว)
        target_year = today.year + offset
        start = datetime(target_year, 1, 1).date()
        end = datetime(target_year, 12, 31).date()
    
    return start, end


@router.get("/mood")
def get_mood_trend(
    period: Literal['week', 'month'] = Query('week'),
    offset: int = Query(0, description="ย้อนหลัง: 0=ปัจจุบัน, -1=ช่วงที่แล้ว, -2=ช่วงก่อนหน้า 2 ช่วง"),
    db: Session = Depends(get_db),
    me: User = Depends(current_user)
):
    """
    ดึงข้อมูลแนวโน้มอารมณ์ (Mood Trend) สำหรับ Line Chart
    
    การคำนวณ:
    1. ดึงบันทึกไดอารี่ที่มี mood_score ในช่วงเวลาที่เลือก
    2. แปลง mood_score เป็นตัวเลข 1-5 (รองรับ 'good'=4, 'bad'=2)
    3. คำนวณค่าเฉลี่ย: average = sum(scores) / len(scores)
    4. คำนวณแนวโน้ม: เทียบค่าเฉลี่ยครึ่งแรก vs ครึ่งหลัง
       - ครึ่งหลัง > ครึ่งแรก + 0.5 → "improving" 📈
       - ครึ่งหลัง < ครึ่งแรก - 0.5 → "declining" 📉
       - อื่นๆ → "stable" ➡️
    
    ตัวอย่าง:
        scores = [3.0, 3.5, 4.0, 4.5, 5.0]
        average = 4.0
        first_half = (3.0 + 3.5) / 2 = 3.25
        second_half = (4.0 + 4.5 + 5.0) / 3 = 4.5
        difference = 4.5 - 3.25 = 1.25 > 0.5 → trend = "improving"
    
    Returns:
        {
            "period": "week",
            "start_date": "2024-11-18",
            "end_date": "2024-11-24",
            "data": [{"date": "2024-11-18", "score": 4.0}, ...],
            "average": 3.8,
            "trend": "improving" | "stable" | "declining",
            "total_entries": 5
        }
    """
    start_date, end_date = get_date_range(period, offset)
    
    # Query diaries ที่มี mood_score ในช่วงเวลาที่เลือก
    diaries = db.query(Diary).filter(
        Diary.user_id == me.id,
        Diary.date >= start_date,
        Diary.date <= end_date,
        Diary.mood_score.isnot(None)
    ).order_by(Diary.date).all()
    
    # แปลง mood_score เป็น numeric (1-5)
    data = []
    scores = []
    for diary in diaries:
        score = diary.mood_score
        # แปลง 'good'/'bad' เป็นตัวเลข (legacy support)
        if isinstance(score, str):
            if score == 'good':
                score = 4.0
            elif score == 'bad':
                score = 2.0
            elif score.isdigit():
                score = float(score)
            else:
                continue
        else:
            score = float(score)
        
        data.append({
            "date": str(diary.date),
            "score": score
        })
        scores.append(score)
    
    # คำนวณค่าเฉลี่ย
    average = round(sum(scores) / len(scores), 1) if scores else 0
    
    # คำนวณ trend (เปรียบเทียบครึ่งแรกกับครึ่งหลัง)
    trend = "stable"
    if len(scores) >= 4:
        mid = len(scores) // 2
        first_half_avg = sum(scores[:mid]) / mid
        second_half_avg = sum(scores[mid:]) / (len(scores) - mid)
        
        if second_half_avg > first_half_avg + 0.5:
            trend = "improving"
        elif second_half_avg < first_half_avg - 0.5:
            trend = "declining"
    
    return {
        "period": period,
        "start_date": str(start_date),
        "end_date": str(end_date),
        "data": data,
        "average": average,
        "trend": trend,
        "total_entries": len(data)
    }


@router.get("/mood-factors")
def get_mood_factors(
    period: Literal['week', 'month'] = Query('week'),
    offset: int = Query(0, description="ย้อนหลัง: 0=ปัจจุบัน, -1=ช่วงที่แล้ว"),
    db: Session = Depends(get_db),
    me: User = Depends(current_user)
):
    """
    วิเคราะห์ปัจจัยที่ส่งผลต่ออารมณ์ (Mood Tags Analysis) สำหรับ Bar Chart
    
    การคำนวณ:
    1. ดึงบันทึกไดอารี่ที่มี mood_tags ในช่วงเวลาที่เลือก
    2. จัดกลุ่ม emoji tags ตาม mood_score:
       - score >= 4 → positive_tags (พลังบวก)
       - score <= 2 → negative_tags (พลังลบ)
       - score = 3 → neutral_tags (กลางๆ)
    3. นับความถี่ของแต่ละ emoji และเลือก Top 5
    
    ตัวอย่าง:
        positive_tags = ['😊', '😊', '😊', '🚀', '🚀', '💪', '😊']
        Counter: {'😊': 4, '🚀': 2, '💪': 1}
        → แสดง Top 5 emoji ที่ใช้บ่อยที่สุด
    
    Returns:
        {
            "period": "week",
            "positive": [{"emoji": "😊", "count": 12}, ...],
            "negative": [{"emoji": "😫", "count": 4}, ...],
            "neutral": [...]
        }
    """
    start_date, end_date = get_date_range(period, offset)
    
    # Query diaries ที่มี mood_tags
    diaries = db.query(Diary).filter(
        Diary.user_id == me.id,
        Diary.date >= start_date,
        Diary.date <= end_date,
        Diary.mood_tags.isnot(None)
    ).all()
    
    # แยก tags ตาม mood_score (good/bad/neutral)
    positive_tags = []  # mood_score >= 4
    negative_tags = []  # mood_score <= 2
    neutral_tags = []   # mood_score = 3
    
    for diary in diaries:
        if not diary.mood_tags:
            continue
        
        score = diary.mood_score
        if isinstance(score, str):
            if score == 'good':
                score = 4.0
            elif score == 'bad':
                score = 2.0
            elif score.isdigit():
                score = float(score)
            else:
                score = 3.0
        else:
            score = float(score) if score else 3.0
        
        # จัดกลุ่ม tags
        for tag in diary.mood_tags:
            if score >= 4:
                positive_tags.append(tag)
            elif score <= 2:
                negative_tags.append(tag)
            else:
                neutral_tags.append(tag)
    
    # นับความถี่และเอา Top 5
    def count_top_tags(tags, limit=5):
        counter = Counter(tags)
        return [
            {"emoji": tag, "count": count}
            for tag, count in counter.most_common(limit)
        ]
    
    return {
        "period": period,
        "positive": count_top_tags(positive_tags),
        "negative": count_top_tags(negative_tags),
        "neutral": count_top_tags(neutral_tags)
    }


@router.get("/completion")
def get_completion_rate(
    period: Literal['week', 'month'] = Query('week'),
    offset: int = Query(0, description="ย้อนหลัง: 0=ปัจจุบัน, -1=ช่วงที่แล้ว"),
    db: Session = Depends(get_db),
    me: User = Depends(current_user)
):
    """
    สรุปความสำเร็จของกิจกรรม (Completion Rate) สำหรับ Donut Chart
    
    การคำนวณ:
    1. ดึงกิจกรรมทั้งหมดในช่วงเวลาที่เลือก
    2. นับจำนวนตาม status:
       - done: เสร็จแล้ว
       - urgent: กำลังทำ
       - normal: ยังไม่เริ่ม
       - cancelled: ยกเลิก
    3. คำนวณอัตราสำเร็จ: completion_rate = (done / total) × 100
    4. คำนวณเปอร์เซ็นต์แต่ละสถานะ: percentage = (count / total) × 100
    
    ตัวอย่าง:
        กิจกรรม 11 รายการ: done=2, urgent=0, normal=9, cancelled=0
        completion_rate = (2 / 11) × 100 = 18.2%
        normal_percentage = (9 / 11) × 100 = 81.8%
    
    Returns:
        {
            "period": "week",
            "total": 11,
            "completed": 2,
            "in_progress": 0,
            "completion_rate": 18.2,
            "data": [
                {"status": "normal", "label": "ยังไม่เริ่ม", "count": 9, "percentage": 81.8, "color": "#595959"},
                {"status": "done", "label": "เสร็จแล้ว", "count": 2, "percentage": 18.2, "color": "#52c41a"}
            ]
        }
    """
    start_date, end_date = get_date_range(period, offset)
    
    # Query activities ในช่วงเวลาที่เลือก
    activities = db.query(Activity).filter(
        Activity.user_id == me.id,
        Activity.date >= start_date,
        Activity.date <= end_date
    ).all()
    
    # Debug: แสดงจำนวนและวันที่ของกิจกรรม
    print(f"\n[COMPLETION] Period: {period}, Offset: {offset}")
    print(f"[COMPLETION] Date range: {start_date} to {end_date}")
    print(f"[COMPLETION] Total activities: {len(activities)}")
    for act in activities:
        print(f"  - {act.date}: {act.title} [{act.status}]")
    
    total = len(activities)
    if total == 0:
        return {
            "period": period,
            "total": 0,
            "completed": 0,
            "in_progress": 0,
            "cancelled": 0,
            "urgent": 0,
            "completion_rate": 0,
            "data": []
        }
    
    # นับตาม status
    status_count = {
        "done": 0,
        "normal": 0,
        "urgent": 0,
        "cancelled": 0
    }
    
    for activity in activities:
        status = activity.status or "normal"
        if status in status_count:
            status_count[status] += 1
        else:
            status_count["normal"] += 1
    
    # คำนวณ completion rate
    completed = status_count["done"]
    in_progress = status_count["normal"] + status_count["urgent"]
    cancelled = status_count["cancelled"]
    completion_rate = round((completed / total) * 100, 1)
    
    # สร้าง data สำหรับ chart (ตรงกับ Frontend constants)
    status_colors = {
        "done": "#52c41a",      # เขียว (เสร็จแล้ว)
        "normal": "#595959",    # เทา (ยังไม่เริ่ม)
        "urgent": "#faad14",    # ส้ม (กำลังทำ)
        "cancelled": "#ff4d4f"  # แดง (ยกเลิก)
    }
    
    status_labels = {
        "done": "เสร็จแล้ว",
        "normal": "ยังไม่เริ่ม",
        "urgent": "กำลังทำ",
        "cancelled": "ยกเลิก"
    }
    
    data = []
    for status, count in status_count.items():
        if count > 0:
            data.append({
                "status": status,
                "label": status_labels[status],
                "count": count,
                "percentage": round((count / total) * 100, 1),
                "color": status_colors[status]
            })
    
    return {
        "period": period,
        "total": total,
        "completed": completed,
        "in_progress": in_progress,
        "cancelled": cancelled,
        "urgent": status_count["urgent"],
        "completion_rate": completion_rate,
        "data": sorted(data, key=lambda x: x["count"], reverse=True)
    }


@router.get("/life-balance")
def get_life_balance(
    period: Literal['week', 'month'] = Query('week'),
    offset: int = Query(0, description="ย้อนหลัง: 0=ปัจจุบัน, -1=ช่วงที่แล้ว"),
    db: Session = Depends(get_db),
    me: User = Depends(current_user)
):
    """
    สมดุลชีวิตตามหมวดหมู่ (Category Distribution) สำหรับ Pie Chart
    
    การคำนวณ:
    1. ดึงกิจกรรมทั้งหมดในช่วงเวลาที่เลือก
    2. นับจำนวนตาม category (เรียน, ทำงาน, ออกกำลังกาย, ฯลฯ)
    3. คำนวณเปอร์เซ็นต์: percentage = (count / total) × 100
    4. สร้างคำเตือน (warning):
       - ถ้าหมวดหมู่ใดมากกว่า 60% → เตือนว่าไม่สมดุล
       - ถ้าสุขภาพน้อยกว่า 10% (และมีกิจกรรม >= 10) → เตือนให้เพิ่มกิจกรรมสุขภาพ
    
    ตัวอย่าง:
        กิจกรรม 9 รายการ: ทำงาน=4, เรียน=3, ออกกำลังกาย=2
        ทำงาน: (4/9) × 100 = 44.4%
        เรียน: (3/9) × 100 = 33.3%
        ออกกำลังกาย: (2/9) × 100 = 22.2%
    
    Returns:
        {
            "period": "week",
            "total": 9,
            "data": [
                {"category": "ทำงาน", "label": "ทำงาน", "count": 4, "percentage": 44.4, "color": "#2196f3", "emoji": "💼"},
                {"category": "เรียน", "label": "เรียน", "count": 3, "percentage": 33.3, "color": "#00bcd4", "emoji": "📚"}
            ],
            "warning": null
        }
    """
    start_date, end_date = get_date_range(period, offset)
    
    # Query activities ในช่วงเวลาที่เลือก
    activities = db.query(Activity).filter(
        Activity.user_id == me.id,
        Activity.date >= start_date,
        Activity.date <= end_date
    ).all()
    
    total = len(activities)
    if total == 0:
        return {
            "period": period,
            "total": 0,
            "data": [],
            "warning": None
        }
    
    # นับตาม category
    category_count = Counter()
    for activity in activities:
        category = activity.category or "อื่นๆ"
        category_count[category] += 1
    
    # ข้อมูล category (รองรับทั้งภาษาไทยและอังกฤษ)
    category_info = {
        # ภาษาไทย (จาก frontend constants)
        "เรียน": {"label": "เรียน", "color": "#00bcd4", "emoji": "📚"},
        "ทำงาน": {"label": "ทำงาน", "color": "#2196f3", "emoji": "💼"},
        "ออกกำลังกาย": {"label": "ออกกำลังกาย", "color": "#4caf50", "emoji": "🏋️"},
        "เรื่องบ้าน": {"label": "เรื่องบ้าน", "color": "#ff9800", "emoji": "🏠"},
        "ส่วนตัว": {"label": "ส่วนตัว", "color": "#9c27b0", "emoji": "👤"},
        "สุขภาพ": {"label": "สุขภาพ", "color": "#e91e63", "emoji": "❤️‍🩹"},
        # ภาษาอังกฤษ (legacy support)
        "work": {"label": "ทำงาน", "color": "#2196f3", "emoji": "💼"},
        "personal": {"label": "ส่วนตัว", "color": "#9c27b0", "emoji": "👤"},
        "health": {"label": "สุขภาพ", "color": "#4caf50", "emoji": "❤️‍🩹"},
        "social": {"label": "สังคม", "color": "#ff9800", "emoji": "👥"},
        "study": {"label": "เรียน", "color": "#00bcd4", "emoji": "📚"},
        "hobby": {"label": "งานอดิเรก", "color": "#e91e63", "emoji": "🎨"},
        # Default
        "อื่นๆ": {"label": "อื่นๆ", "color": "#9e9e9e", "emoji": "📋"},
        "other": {"label": "อื่นๆ", "color": "#9e9e9e", "emoji": "📋"}
    }
    
    # สร้าง data สำหรับ chart
    data = []
    for category, count in category_count.most_common():
        # ใช้ info จาก mapping หรือสร้าง default ถ้าไม่มี
        info = category_info.get(category, {
            "label": category if category else "อื่นๆ",
            "emoji": "📋",
            "color": "#9e9e9e"
        })
        percentage = round((count / total) * 100, 1)
        data.append({
            "category": category,
            "label": info["label"],
            "emoji": info["emoji"],
            "count": count,
            "percentage": percentage,
            "color": info["color"]
        })
    
    # สร้างคำเตือน (ถ้ามี category ใดมากเกิน 60%)
    warning = None
    for item in data:
        if item["percentage"] >= 60:
            warning = f"คุณใช้เวลากับ{item['label']}มากเกินไป ({item['percentage']}%) ลองสร้างสมดุลชีวิตบ้างนะ"
            break
    
    # ตรวจสอบว่ามีสุขภาพน้อยเกินไป (< 10% แต่มีกิจกรรมอื่นๆ)
    health_percentage = next((item["percentage"] for item in data if item["category"] == "health"), 0)
    if health_percentage < 10 and total >= 10:
        warning = f"คุณใช้เวลาดูแลสุขภาพแค่ {health_percentage}% ลองเพิ่มกิจกรรมออกกำลังกายบ้างนะ"
    
    return {
        "period": period,
        "total": total,
        "data": data,
        "warning": warning
    }


@router.get("/summary")
def get_dashboard_summary(
    period: Literal['week', 'month'] = Query('week'),
    offset: int = Query(0, description="ย้อนหลัง: 0=ปัจจุบัน, -1=ช่วงที่แล้ว"),
    db: Session = Depends(get_db),
    me: User = Depends(current_user)
):
    """
    สรุปข้อมูลทั้งหมดสำหรับ Dashboard (เรียกครั้งเดียวได้หมด)
    
    Endpoint นี้รวมข้อมูลจาก 4 ส่วน:
    1. mood: แนวโน้มอารมณ์ (average, trend)
    2. mood_factors: ปัจจัยต่อความรู้สึก (positive/negative emoji tags)
    3. completion: วินัยของคุณ (completion_rate, สถานะกิจกรรม)
    4. life_balance: ความสมดุลชีวิต (การกระจายเวลาตามหมวดหมู่)
    
    ประโยชน์: ลด API calls จาก 4 ครั้ง → 1 ครั้ง (เร็วกว่า, ประหยัด bandwidth)
    
    Returns:
        {
            "mood": {แนวโน้มอารมณ์},
            "mood_factors": {ปัจจัยความรู้สึก},
            "completion": {วินัยของคุณ},
            "life_balance": {ความสมดุลชีวิต}
        }
    """
    return {
        "mood": get_mood_trend(period, offset, db, me),
        "mood_factors": get_mood_factors(period, offset, db, me),
        "completion": get_completion_rate(period, offset, db, me),
        "life_balance": get_life_balance(period, offset, db, me)
    }
