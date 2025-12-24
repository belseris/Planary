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
from typing import Literal, Optional
from collections import Counter
import statistics

router = APIRouter(prefix="/trends", tags=["trends"])


def normalize_score(raw_score):
    """Convert legacy mood_score values to float 1-5."""
    if raw_score is None:
        return None
    if isinstance(raw_score, str):
        if raw_score == "good":
            return 4.0
        if raw_score == "bad":
            return 2.0
        if raw_score.isdigit():
            return float(raw_score)
        try:
            return float(raw_score)
        except (TypeError, ValueError):
            return None
    return float(raw_score)


def calculate_average(scores):
    return round(sum(scores) / len(scores), 1) if scores else 0


def fetch_diaries(db: Session, start_date, end_date, user_id=None, require_tags=False):
    query = db.query(Diary).filter(
        Diary.date >= start_date,
        Diary.date <= end_date,
    )
    if require_tags:
        query = query.filter(Diary.mood_tags.isnot(None))
    else:
        query = query.filter(Diary.mood_score.isnot(None))
    if user_id:
        query = query.filter(Diary.user_id == user_id)
    return query.order_by(Diary.date).all()


def bucket_score(score: float):
    bucket = int(round(score))
    return min(max(bucket, 1), 5)


def calculate_median(scores):
    """Calculate median of scores."""
    return round(statistics.median(scores), 1) if scores and len(scores) >= 1 else 0


def calculate_stddev(scores):
    """Calculate standard deviation of scores."""
    return round(statistics.stdev(scores), 2) if scores and len(scores) >= 2 else 0


def calculate_percentile(value: float, all_values: list) -> float:
    """Calculate percentile rank (0-1) of a value in a list."""
    if not all_values or len(all_values) == 0:
        return 0
    count_below = sum(1 for v in all_values if v < value)
    percentile = (count_below / len(all_values))
    return round(percentile, 2)


def calculate_best_streak(daily_completion_rates: list) -> int:
    """Find longest streak of consecutive days with completion_rate >= 50%."""
    if not daily_completion_rates:
        return 0
    max_streak = 0
    current_streak = 0
    for day in daily_completion_rates:
        if day.get("rate", 0) >= 50:
            current_streak += 1
            max_streak = max(max_streak, current_streak)
        else:
            current_streak = 0
    return max_streak


def analyze_mood_factors(period: str, offset: int, db: Session, user_id=None, limit: int = 5):
    start_date, end_date = get_date_range(period, offset)
    diaries = fetch_diaries(db, start_date, end_date, user_id=user_id, require_tags=True)

    positive_tags = []
    negative_tags = []
    neutral_tags = []

    # Mapping emoji → human-friendly Thai labels
    EMOJI_LABELS = {
        "✅": "ทำสำเร็จ",
        "☕": "กาแฟ/เครื่องดื่ม",
        "🍜": "อาหาร",
        "🍽️": "อาหาร",
        "🏃": "ออกกำลังกาย",
        "💪": "พลังใจ/กำลังใจ",
        "📚": "เรียน",
        "💼": "งาน",
        "🏠": "เรื่องบ้าน",
        "🚗": "เดินทาง",
        "🚌": "เดินทาง",
        "🚃": "เดินทาง",
        "🎉": "กิจกรรมสนุก",
        "🎨": "งานอดิเรก",
        "😫": "เหนื่อย",
        "😞": "ผิดหวัง",
        "😢": "เศร้า",
        "😡": "เครียด/โกรธ",
        "😷": "ป่วย",
        "🤒": "ป่วย",
        "❤️": "ความรัก",
        "❤️‍🩹": "ดูแลสุขภาพ",
        "👥": "สังคม",
    }

    def tag_label(tag: str) -> str:
        if not tag:
            return "แท็ก"
        # ถ้า tag เป็นตัวหนังสือ (ไม่ใช่ emoji) ให้ใช้ตามนั้นเลย
        try:
            # heuristic: emoji มักเป็นอักขระเดี่ยวหรือรวมกับ variation selector
            if len(tag) > 2 and tag not in EMOJI_LABELS:
                return tag
        except Exception:
            pass
        return EMOJI_LABELS.get(tag, tag)

    for diary in diaries:
        if not diary.mood_tags:
            continue
        score = normalize_score(diary.mood_score)
        score = score if score is not None else 3.0
        for tag in diary.mood_tags:
            if score >= 4:
                positive_tags.append(tag)
            elif score <= 2:
                negative_tags.append(tag)
            else:
                neutral_tags.append(tag)

    def count_top_tags(tags):
        counter = Counter(tags)
        return [
            {"emoji": tag, "label": tag_label(tag), "count": count}
            for tag, count in counter.most_common(limit)
        ]

    return {
        "period": period,
        "positive": count_top_tags(positive_tags),
        "negative": count_top_tags(negative_tags),
        "neutral": count_top_tags(neutral_tags),
        "total_entries": len(diaries)
    }


CATEGORY_LABELS = {
    "เรียน": "เรียน",
    "ทำงาน": "ทำงาน",
    "ออกกำลังกาย": "ออกกำลังกาย",
    "เรื่องบ้าน": "เรื่องบ้าน",
    "ส่วนตัว": "ส่วนตัว",
    "สุขภาพ": "สุขภาพ",
    "work": "ทำงาน",
    "study": "เรียน",
    "health": "สุขภาพ",
    "personal": "ส่วนตัว",
    "social": "สังคม",
    "hobby": "งานอดิเรก",
    "other": "อื่นๆ",
    "อื่นๆ": "อื่นๆ"
}


def calculate_completion_stats(period: str, offset: int, db: Session, user_id=None):
    start_date, end_date = get_date_range(period, offset)
    query = db.query(Activity).filter(
        Activity.date >= start_date,
        Activity.date <= end_date
    )
    if user_id:
        query = query.filter(Activity.user_id == user_id)
    activities = query.all()

    total = len(activities)
    if total == 0:
        return {
            "period": period,
            "overall_rate": 0,
            "total": 0,
            "completed": 0,
            "in_progress": 0,
            "cancelled": 0,
            "urgent": 0,
            "data": [],
            "daily": [],
            "streak_best": 0,
            "top_category_of_completed": None
        }

    status_count = {"done": 0, "normal": 0, "urgent": 0, "cancelled": 0}
    completed_categories = Counter()
    daily_activities = {}

    for activity in activities:
        status = (activity.status or "normal")
        if status in status_count:
            status_count[status] += 1
        else:
            status_count["normal"] += 1
        if status == "done" and activity.category:
            completed_categories[activity.category] += 1
        
        # ต้องคำนวณ daily completion
        date_key = str(activity.date)
        if date_key not in daily_activities:
            daily_activities[date_key] = {"total": 0, "done": 0}
        daily_activities[date_key]["total"] += 1
        if status == "done":
            daily_activities[date_key]["done"] += 1

    completed = status_count["done"]
    in_progress = status_count["normal"] + status_count["urgent"]
    cancelled = status_count["cancelled"]
    completion_rate = round((completed / total) * 100, 1)

    # สร้าง daily array พร้อมคำนวณ rate
    daily_array = []
    for date_str in sorted(daily_activities.keys()):
        day_data = daily_activities[date_str]
        rate = round((day_data["done"] / day_data["total"]) * 100, 1) if day_data["total"] > 0 else 0
        daily_array.append({
            "date": date_str,
            "total": day_data["total"],
            "done": day_data["done"],
            "rate": rate
        })

    # คำนวณ best streak
    streak_best = calculate_best_streak(daily_array)

    status_colors = {
        "done": "#52c41a",
        "normal": "#595959",
        "urgent": "#faad14",
        "cancelled": "#ff4d4f"
    }

    status_labels = {
        "done": "เสร็จแล้ว",
        "normal": "ยังไม่เริ่ม",
        "urgent": "กำลังทำ",
        "cancelled": "ยกเลิก"
    }

    data = []
    # Always include done, urgent, normal (even if count = 0)
    required_statuses = ["done", "urgent", "normal"]
    for status in required_statuses:
        count = status_count.get(status, 0)
        data.append({
            "status": status,
            "label": status_labels[status],
            "count": count,
            "percentage": round((count / total) * 100, 1) if total > 0 else 0,
            "color": status_colors[status]
        })

    top_category_of_completed = None
    if completed_categories:
        top_category = completed_categories.most_common(1)[0][0]
        top_category_of_completed = CATEGORY_LABELS.get(top_category, top_category)

    return {
        "period": period,
        "overall_rate": completion_rate,
        "total": total,
        "completed": completed,
        "in_progress": in_progress,
        "cancelled": cancelled,
        "urgent": status_count["urgent"],
        "data": sorted(data, key=lambda x: x["count"], reverse=True),
        "daily": daily_array,
        "streak_best": streak_best,
        "top_category_of_completed": top_category_of_completed
    }


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
    diaries = fetch_diaries(db, start_date, end_date, user_id=me.id)
    
    # แปลง mood_score เป็น numeric (1-5)
    data = []
    scores = []
    positive_scores = []
    negative_scores = []
    logged_dates = set()
    for diary in diaries:
        score = normalize_score(diary.mood_score)
        if score is None:
            continue
        data.append({"date": str(diary.date), "score": score})
        scores.append(score)
        logged_dates.add(diary.date)
        # เก็บ positive/negative ถ้ามี
        if getattr(diary, "positive_score", None) is not None:
            try:
                positive_scores.append(float(diary.positive_score))
            except Exception:
                pass
        if getattr(diary, "negative_score", None) is not None:
            try:
                negative_scores.append(float(diary.negative_score))
            except Exception:
                pass
    
    # คำนวณค่าเฉลี่ย
    average = calculate_average(scores)
    positive_avg = calculate_average(positive_scores) if positive_scores else None
    negative_avg = calculate_average(negative_scores) if negative_scores else None
    median = calculate_median(scores)
    stddev = calculate_stddev(scores)
    
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
    
    # เปรียบเทียบกับช่วงก่อนหน้า
    prev_start, prev_end = get_date_range(period, offset - 1)
    prev_diaries = fetch_diaries(db, prev_start, prev_end, user_id=me.id)
    prev_scores = [normalize_score(d.mood_score) for d in prev_diaries if normalize_score(d.mood_score) is not None]
    prev_average = calculate_average(prev_scores) if prev_scores else None
    trend_diff = round(average - prev_average, 1) if prev_average is not None else None
    
    total_days = (end_date - start_date).days + 1
    logged_days = len(logged_dates)
    
    return {
        "period": period,
        "start_date": str(start_date),
        "end_date": str(end_date),
        "daily": data,
        "average": average,
        "positive_avg": positive_avg,
        "negative_avg": negative_avg,
        "median": median,
        "stddev": stddev,
        "trend": trend,
        "trend_diff": trend_diff,
        "total_entries": len(data),
        "logged_days": logged_days,
        "total_days": total_days
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
    return analyze_mood_factors(period, offset, db, user_id=me.id)


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
    return calculate_completion_stats(period, offset, db, user_id=me.id)


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
    # Create category key mapping (Thai to English key)
    category_key_map = {
        "เรียน": "study",
        "ทำงาน": "work",
        "ออกกำลังกาย": "health",
        "เรื่องบ้าน": "household",
        "ส่วนตัว": "personal",
        "สุขภาพ": "health",
        "work": "work",
        "personal": "personal",
        "health": "health",
        "social": "social",
        "study": "study",
        "hobby": "hobby",
        "other": "other",
        "อื่นๆ": "other"
    }
    
    for category, count in category_count.most_common():
        # ใช้ info จาก mapping หรือสร้าง default ถ้าไม่มี
        info = category_info.get(category, {
            "label": category if category else "อื่นๆ",
            "emoji": "📋",
            "color": "#9e9e9e"
        })
        percentage = round((count / total) * 100, 1)
        key = category_key_map.get(category, "other")
        data.append({
            "key": key,
            "category": category,
            "label": info["label"],
            "emoji": info["emoji"],
            "count": count,
            "percentage": percentage,
            "color": info["color"]
        })
    
    # สร้างคำเตือน (ถ้ามี category ใดมากเกิน 60%)
    warnings = []
    for item in data:
        if item["percentage"] >= 60:
            warnings.append(f"คุณใช้เวลากับ{item['label']}มากเกินไป ({item['percentage']}%) ลองสร้างสมดุลชีวิตบ้างนะ")
            break
    
    # ตรวจสอบว่ามีสุขภาพน้อยเกินไป (< 10% แต่มีกิจกรรมอื่นๆ)
    health_percentage = next((item["percentage"] for item in data if item["category"] in ["health", "สุขภาพ"]), 0)
    if health_percentage < 10 and total >= 10:
        warnings.append(f"คุณใช้เวลาดูแลสุขภาพแค่ {health_percentage}% ลองเพิ่มกิจกรรมออกกำลังกายบ้างนะ")
    warning = warnings[0] if warnings else None
    
    return {
        "period": period,
        "total": total,
        "data": data,
        "warning": warning,
        "warnings": warnings
    }


def get_community_mood(period: Literal['week', 'month'], offset: int, db: Session, my_average: Optional[float] = None):
    start_date, end_date = get_date_range(period, offset)
    diaries = fetch_diaries(db, start_date, end_date)

    scores = []
    user_ids = set()
    for diary in diaries:
        score = normalize_score(diary.mood_score)
        if score is None:
            continue
        scores.append(score)
        user_ids.add(diary.user_id)

    average = calculate_average(scores)
    stddev = calculate_stddev(scores)

    prev_start, prev_end = get_date_range(period, offset - 1)
    prev_diaries = fetch_diaries(db, prev_start, prev_end)
    prev_scores = [normalize_score(d.mood_score) for d in prev_diaries if normalize_score(d.mood_score) is not None]
    prev_average = calculate_average(prev_scores) if prev_scores else None
    trend_diff = round(average - prev_average, 1) if prev_average is not None else None

    # Calculate percentile of user's mood
    percentile_of_me = calculate_percentile(my_average, scores) if my_average is not None else None

    return {
        "period": period,
        "average": average,
        "stddev": stddev,
        "trend_diff": trend_diff,
        "total_entries": len(scores),
        "user_count": len(user_ids),
        "percentile_of_me": percentile_of_me
    }


def get_community_mood_distribution(period: Literal['week', 'month'], offset: int, db: Session):
    start_date, end_date = get_date_range(period, offset)
    diaries = fetch_diaries(db, start_date, end_date)
    scores = [normalize_score(d.mood_score) for d in diaries if normalize_score(d.mood_score) is not None]
    buckets = Counter(bucket_score(score) for score in scores)
    distribution = [{"score": score, "count": buckets.get(score, 0)} for score in range(1, 6)]
    return {
        "period": period,
        "distribution": distribution,
        "total_entries": len(scores)
    }


def get_community_mood_factors(period: Literal['week', 'month'], offset: int, db: Session):
    return analyze_mood_factors(period, offset, db, user_id=None, limit=5)


def get_community_completion(period: Literal['week', 'month'], offset: int, db: Session):
    return calculate_completion_stats(period, offset, db, user_id=None)


def get_activity_heatmap(period: Literal['week', 'month'], offset: int, db: Session):
    """Build a 7x24 heatmap of activity counts (all users) by weekday and hour.
    All-day activities will be ignored for heatmap/time-based analysis.
    Returns a dict: { days: [...], hours: [0..23], matrix: number[7][24] }
    """
    start_date, end_date = get_date_range(period, offset)
    activities = db.query(Activity).filter(
        Activity.date >= start_date,
        Activity.date <= end_date
    ).all()

    # Initialize 7x24 matrix
    matrix = [[0 for _ in range(24)] for _ in range(7)]
    for act in activities:
        try:
            # skip all-day entries for hour-based heatmap
            if getattr(act, "all_day", False):
                continue
            if not act.time:
                continue
            hour = getattr(act.time, "hour", None)
            if hour is None:
                # If act.time is string or other format, try parsing
                try:
                    hour = int(str(act.time)[:2])
                except Exception:
                    continue
            weekday = act.date.weekday()  # 0 = Monday ... 6 = Sunday
            if 0 <= weekday <= 6 and 0 <= hour <= 23:
                matrix[weekday][hour] += 1
        except Exception:
            continue

    days_th = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.']
    return {
        "days": days_th,
        "hours": list(range(24)),
        "matrix": matrix
    }


def get_peak_time(period: Literal['week', 'month'], offset: int, db: Session):
    """Calculate percentage distribution of activities by time buckets for all users.
    Buckets: morning(5-11), noon(11-15), evening(17-21), night(21-5).
    Returns: { morning, noon, evening, night, summary }
    """
    start_date, end_date = get_date_range(period, offset)
    activities = db.query(Activity).filter(
        Activity.date >= start_date,
        Activity.date <= end_date
    ).all()

    buckets = {
        "morning": 0,   # 05:00 - 10:59
        "noon": 0,      # 11:00 - 14:59
        "evening": 0,   # 17:00 - 20:59
        "night": 0      # 21:00 - 04:59
    }
    total_timed = 0
    for act in activities:
        if getattr(act, "all_day", False):
            continue
        if not act.time:
            continue
        hour = getattr(act.time, "hour", None)
        try:
            hour = hour if hour is not None else int(str(act.time)[:2])
        except Exception:
            continue
        total_timed += 1
        if 5 <= hour <= 10:
            buckets["morning"] += 1
        elif 11 <= hour <= 14:
            buckets["noon"] += 1
        elif 17 <= hour <= 20:
            buckets["evening"] += 1
        else:
            buckets["night"] += 1

    def to_pct(v):
        return round((v / total_timed) * 100, 1) if total_timed > 0 else 0

    pct = {k: to_pct(v) for k, v in buckets.items()}
    # Build summary sentence
    max_bucket = max(pct, key=lambda k: pct[k]) if total_timed > 0 else None
    label_map = {
        "morning": "เช้า",
        "noon": "กลางวัน",
        "evening": "เย็น",
        "night": "กลางคืน"
    }
    summary = None
    if max_bucket:
        summary = f"กิจกรรมส่วนใหญ่อยู่ช่วง{label_map[max_bucket]} ({pct[max_bucket]}%)"

    pct["summary"] = summary
    return pct


def get_community_category_mix(period: Literal['week', 'month'], offset: int, db: Session):
    """Return category distribution across all users.
    Shape: { items: [{ label, value }] } with value as percentage.
    """
    start_date, end_date = get_date_range(period, offset)
    activities = db.query(Activity).filter(
        Activity.date >= start_date,
        Activity.date <= end_date
    ).all()

    total = len(activities)
    if total == 0:
        return { "items": [] }

    counts = Counter()
    for act in activities:
        cat = act.category or "อื่นๆ"
        # normalize to common Thai label if possible
        label = CATEGORY_LABELS.get(cat, cat)
        counts[label] += 1

    # top 6
    items = []
    for label, count in counts.most_common(6):
        value = round((count / total) * 100, 1)
        items.append({ "label": label, "value": value })

    return { "items": items }


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
        My Dashboard (me):
            1. mood: แนวโน้มอารมณ์ (average, trend, change_from_prev, logged_days)
            2. mood_factors: ปัจจัยต่อความรู้สึก (positive/negative emoji tags)
            3. completion: วินัยของคุณ (completion_rate, สถานะกิจกรรม, top_category_of_completed)
            4. life_balance: ความสมดุลชีวิต (การกระจายเวลาตามหมวดหมู่ + warnings)

        Community Dashboard (community):
            - mood: ค่าเฉลี่ยอารมณ์รวม + change_from_prev + user_count
            - mood_distribution: การกระจายคะแนนอารมณ์ 1-5
            - mood_factors: ปัจจัยอารมณ์ยอดนิยมของทุกคน
            - completion: สรุป completion โดยรวม (ถ้าต้องการเปรียบเทียบวินัย)
    
    ประโยชน์: ลด API calls จาก 4 ครั้ง → 1 ครั้ง (เร็วกว่า, ประหยัด bandwidth)
    
    Returns:
        {
            "me": {
                "mood": {...},
                "mood_factors": {...},
                "completion": {...},
                "life_balance": {...}
            },
            "community": {
                "mood": {...},
                "mood_distribution": {...},
                "mood_factors": {...},
                "completion": {...}
            }
        }
    """
    my_mood = get_mood_trend(period, offset, db, me)
    my_mood_factors = analyze_mood_factors(period, offset, db, user_id=me.id)
    my_completion = calculate_completion_stats(period, offset, db, user_id=me.id)
    my_life_balance = get_life_balance(period, offset, db, me)

    community_mood = get_community_mood(period, offset, db, my_average=my_mood.get("average"))
    community_mood_distribution = get_community_mood_distribution(period, offset, db)
    community_mood_factors = get_community_mood_factors(period, offset, db)
    community_completion = get_community_completion(period, offset, db)
    # Activity patterns (community-wide)
    activity_heatmap = get_activity_heatmap(period, offset, db)
    peak_time = get_peak_time(period, offset, db)
    category_mix = get_community_category_mix(period, offset, db)

    return {
        "me": {
            "mood": my_mood,
            "mood_factors": my_mood_factors,
            "completion": my_completion,
            "life_balance": my_life_balance
        },
        "community": {
            "mood": community_mood,
            "mood_distribution": community_mood_distribution,
            "mood_factors": community_mood_factors,
            "completion": community_completion,
            "activity_patterns": {
                "heatmap": activity_heatmap,
                "peak_time": peak_time,
                "category_mix": category_mix
            }
        }
    }
