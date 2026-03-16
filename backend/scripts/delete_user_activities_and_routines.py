import argparse
from pathlib import Path

from sqlalchemy import create_engine, text


def get_database_url() -> str:
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        raise FileNotFoundError(f"Missing .env at {env_path}")

    for line in env_path.read_text(encoding="utf-8").splitlines():
        if line.startswith("DATABASE_URL="):
            return line.split("=", 1)[1].strip()

    raise ValueError("DATABASE_URL not found in .env")


def main() -> None:
    parser = argparse.ArgumentParser(description="Delete activities and routines for a user")
    parser.add_argument("--username", required=True, help="Exact username to delete data for")
    args = parser.parse_args()

    engine = create_engine(get_database_url())
    with engine.begin() as conn:
        user_row = conn.execute(
            text("SELECT id FROM users WHERE username = :username"),
            {"username": args.username},
        ).fetchone()

        if not user_row:
            print(f"User not found: {args.username}")
            return

        user_id = user_row[0]

        activities_deleted = conn.execute(
            text("DELETE FROM activities WHERE user_id = :uid"),
            {"uid": user_id},
        ).rowcount or 0

        routines_deleted = conn.execute(
            text("DELETE FROM routine_activities WHERE user_id = :uid"),
            {"uid": user_id},
        ).rowcount or 0

    print(f"Deleted activities: {activities_deleted}")
    print(f"Deleted routine_activities: {routines_deleted}")


if __name__ == "__main__":
    main()
