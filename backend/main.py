from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from db.session import Base, engine
from routers.login import router as login_router
from routers.register import router as register_router
from routers.profile import router as profile_router
from routers.home import router as home_router
from routers.diary import router as diary_router
from routers.activities import router as activities_router
from core.config import settings

import models.user

app = FastAPI(title="Planary API")

Base.metadata.create_all(bind=engine)

app.mount("/media", StaticFiles(directory=settings.media_dir), name="media")

app.include_router(register_router)
app.include_router(login_router)
app.include_router(profile_router)
app.include_router(home_router)
app.include_router(diary_router)
app.include_router(activities_router)
