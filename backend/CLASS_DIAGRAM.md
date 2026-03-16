# Backend Class Diagram

```mermaid
classDiagram
    direction LR

    class User {
        +UUID id
        +String email
        +String username
        +String gender
        +Integer age
        +String password_hash
        +String avatar_url
    }

    class Diary {
        +UUID id
        +UUID user_id
        +Date date
        +Time time
        +String title
        +String detail
        +String mood
        +Integer positive_score
        +Integer negative_score
        +Integer mood_score
        +JSONB mood_tags
        +String tags
        +JSONB activities
        +DateTime created_at
        +DateTime updated_at
    }

    class Activity {
        +UUID id
        +UUID user_id
        +UUID routine_id
        +Date date
        +Boolean all_day
        +Time time
        +String title
        +String category
        +String status
        +Boolean remind
        +Integer remind_offset_min
        +String remind_type
        +Boolean remind_sound
        +Boolean notification_sent
        +String notification_id
        +String notes
        +JSONB subtasks
        +JSONB repeat_config
        +DateTime created_at
        +DateTime updated_at
    }

    class RoutineActivity {
        +UUID id
        +UUID user_id
        +String day_of_week
        +String title
        +String category
        +Time time
        +String notes
        +JSONB subtasks
        +String priority
        +String reminder_minutes
        +Boolean remind_sound
        +String notification_id
    }

    User "1" --> "0..*" Diary : user_id (CASCADE)
    User "1" --> "0..*" Activity : user_id (CASCADE)
    User "1" --> "0..*" RoutineActivity : user_id (CASCADE)

    RoutineActivity "1" --> "0..*" Activity : routine_id
    Activity "0..*" --> "0..1" RoutineActivity : derived from
```

## Notes

- This diagram is generated from SQLAlchemy models in `backend/models`.
- `Activity.routine_id` is optional, so an activity may or may not come from a routine template.
- `User` delete cascades to `Diary`, `Activity`, and `RoutineActivity` via foreign keys.

## Unified Architecture (Models + Schemas + Routers)

```mermaid
flowchart LR
    APP["FastAPI App\nmain.py"]

    subgraph R["Routers"]
        R_LOGIN["login router\n/login"]
        R_REGISTER["register router\n/register"]
        R_PROFILE["profile router\n/profile"]
        R_HOME["home router\n/home"]
        R_DIARY["diary router\n/diary"]
        R_ACT["activities router\n/activities"]
        R_ROUTINE["routine_activities router\n/routine-activities"]
        R_TRENDS["trends router\n/trends"]
        R_TOKEN["token router\n/auth"]
    end

    subgraph S["Schemas (Pydantic DTOs)"]
        S_LOGIN["schemas.login\nLoginRequest, TokenPairResponse,\nRefreshRequest, TokenResponse"]
        S_REGISTER["schemas.register\nRegisterRequest, RegisterResponse"]
        S_PROFILE["schemas.profile\nProfileMe, ProfileUpdateRequest,\nPasswordChangeRequest"]
        S_HOME["schemas.home\nDiaryItem, DiaryListResponse"]
        S_DIARY["schemas.diary\nDiaryCreate, DiaryUpdate, DiaryResponse"]
        S_ACT["schemas.activities\nActivityCreate, ActivityUpdate,\nActivityOut, ActivityList"]
        S_ROUTINE["schemas.routine_activity\nRoutineActivityCreate,\nRoutineActivityUpdate,\nRoutineActivityResponse"]
        S_INLINE["Inline/Dict response\n(no dedicated schema)"]
    end

    subgraph M["Models (SQLAlchemy)"]
        M_USER["models.user.User"]
        M_DIARY["models.diary.Diary"]
        M_ACT["models.activity.Activity"]
        M_ROUTINE["models.routine_activity.RoutineActivity"]
    end

    D_AUTH["Dependency\ncurrent_user()"]
    D_DB["Dependency\nget_db()"]

    APP --> R_LOGIN
    APP --> R_REGISTER
    APP --> R_PROFILE
    APP --> R_HOME
    APP --> R_DIARY
    APP --> R_ACT
    APP --> R_ROUTINE
    APP --> R_TRENDS
    APP --> R_TOKEN

    R_LOGIN --> S_LOGIN
    R_REGISTER --> S_REGISTER
    R_PROFILE --> S_PROFILE
    R_HOME --> S_HOME
    R_DIARY --> S_DIARY
    R_ACT --> S_ACT
    R_ROUTINE --> S_ROUTINE
    R_TOKEN --> S_LOGIN
    R_TRENDS --> S_INLINE

    R_LOGIN --> M_USER
    R_REGISTER --> M_USER
    R_PROFILE --> M_USER

    R_HOME --> M_DIARY
    R_HOME --> M_USER

    R_DIARY --> M_DIARY
    R_DIARY --> M_USER

    R_ACT --> M_ACT
    R_ACT --> M_ROUTINE
    R_ACT --> M_USER

    R_ROUTINE --> M_ROUTINE
    R_ROUTINE --> M_ACT
    R_ROUTINE --> M_USER

    R_TRENDS --> M_DIARY
    R_TRENDS --> M_ACT
    R_TRENDS --> M_USER

    R_HOME -. Depends .-> D_AUTH
    R_DIARY -. Depends .-> D_AUTH
    R_ACT -. Depends .-> D_AUTH
    R_ROUTINE -. Depends .-> D_AUTH
    R_TRENDS -. Depends .-> D_AUTH
    R_PROFILE -. Provides .-> D_AUTH

    R_LOGIN -. Depends .-> D_DB
    R_REGISTER -. Depends .-> D_DB
    R_PROFILE -. Depends .-> D_DB
    R_HOME -. Depends .-> D_DB
    R_DIARY -. Depends .-> D_DB
    R_ACT -. Depends .-> D_DB
    R_ROUTINE -. Depends .-> D_DB
    R_TRENDS -. Depends .-> D_DB
```

### Reading Guide

- `main.py` includes all routers into one FastAPI app.
- Routers validate request/response using Schemas (DTO layer).
- Routers query/write Models via SQLAlchemy session (`get_db`).
- Auth-protected routers rely on `current_user()` from `routers.profile`.
