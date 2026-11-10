import logging
import shutil
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.config import settings
from app.core.session_manager import session_manager
from app.services.demucs_service import demucs_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("apollo.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure storage paths & run routine cleanup
    logger.info("Initializing Project Apollo ML Backend...")
    session_manager._ensure_storage_dirs()
    purged = session_manager.cleanup_expired_sessions()
    if purged:
        logger.info(f"Purged {purged} expired audio session(s) on startup.")

    ffmpeg_installed = shutil.which("ffmpeg") is not None
    demucs_installed = demucs_service.check_demucs_installed()
    logger.info(f"System status - FFmpeg available: {ffmpeg_installed}, Demucs/PyTorch available: {demucs_installed}")

    yield

    # Shutdown
    logger.info("Project Apollo ML Backend shutting down.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Local music layer separation, stem extraction, and automated notation generation via ML pipelines.",
    version="0.1.0",
    lifespan=lifespan,
)

# Cross-Origin Resource Sharing for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {
        "project": settings.PROJECT_NAME,
        "version": "0.1.0",
        "status": "online",
        "docs_url": "/docs",
    }


@app.get("/health")
async def health_check():
    ffmpeg_installed = shutil.which("ffmpeg") is not None
    demucs_installed = demucs_service.check_demucs_installed()

    return {
        "status": "healthy",
        "ffmpeg": "available" if ffmpeg_installed else "missing",
        "demucs_engine": "production" if demucs_installed else "development_fallback",
        "storage_dir": str(settings.STORAGE_DIR),
    }
