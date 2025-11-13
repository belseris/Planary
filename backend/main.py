from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from db.session import Base, engine
from routers.login import router as login_router
from routers.register import router as register_router
from routers.profile import router as profile_router
from routers.home import router as home_router
from routers.diary import router as diary_router
from routers.activities import router as activities_router
from core.config import settings
from routers.routine_activities import router as routine_activities_router
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

import models.user

app = FastAPI(title="Planary API")

Base.metadata.create_all(bind=engine)

app.mount("/media", StaticFiles(directory=settings.media_dir), name="media")

# CORS for development: allow requests from the mobile app / emulator
app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)


@app.get("/ping")
def ping():
	return {"ping": "pong"}

app.include_router(register_router)
app.include_router(login_router)
app.include_router(profile_router)
app.include_router(home_router)
app.include_router(diary_router)
app.include_router(activities_router)
app.include_router(routine_activities_router)   


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
	# Print detailed validation errors to help debugging 422 responses.
	# Avoid awaiting request.json() here because reading the body in the
	# exception handler can sometimes raise CancelledError during shutdown/reload.
	body_preview = '<body not read>'
	try:
		# Try to access the raw body if already available on the request scope
		if hasattr(request, 'scope') and 'body' in request.scope:
			body_preview = request.scope.get('body')
	except Exception:
		body_preview = '<unable to read body>'
	print('\n=== Request validation error ===')
	try:
		print('Request:', request.method, request.url)
	except Exception:
		print('Request: <unavailable>')
	print('Errors:', exc.errors())
	print('Body preview:', body_preview)
	print('================================\n')
	return JSONResponse(status_code=422, content={"detail": exc.errors()})
