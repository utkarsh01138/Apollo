from fastapi import APIRouter
from app.api.v1.stems import router as stems_router
from app.api.v1.tasks import router as tasks_router
from app.api.v1.midi import router as midi_router

api_router = APIRouter()
api_router.include_router(stems_router)
api_router.include_router(tasks_router)
api_router.include_router(midi_router)
