from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql+psycopg2://postgres:Ratthapak123@localhost:5432/Diary_db"

def main() -> None:
    engine = create_engine(DATABASE_URL)
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE routine_activities ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium'"))
        conn.execute(text("ALTER TABLE routine_activities ADD COLUMN IF NOT EXISTS reminder_minutes VARCHAR(100) DEFAULT '15'"))

if __name__ == "__main__":
    main()
