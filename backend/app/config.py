import os
from pathlib import Path
from typing import Optional

BASE_DIR = Path(__file__).resolve().parent.parent

try:
    from pydantic_settings import BaseSettings

    class Settings(BaseSettings):
        PROJECT_NAME: str = "Project Apollo"
        API_V1_STR: str = "/api/v1"
        CORS_ORIGINS: list[str] = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
        BASE_DIR: Path = BASE_DIR
        STORAGE_DIR: Path = BASE_DIR / "storage"
        DEMUCS_MODEL: str = "htdemucs"
        DEMUCS_DEVICE: str = "cuda" if os.environ.get("CUDA_VISIBLE_DEVICES") else "auto"
        ALLOWED_EXTENSIONS: set[str] = {".mp3", ".wav", ".flac", ".ogg", ".m4a"}
        MAX_UPLOAD_SIZE_MB: int = 100
        SESSION_EXPIRY_HOURS: int = 24

        class Config:
            env_prefix = "APOLLO_"
            case_sensitive = True

    settings = Settings()

except ImportError:
    # Lightweight fallback when pydantic_settings is not yet installed
    class FallbackSettings:
        PROJECT_NAME: str = os.getenv("APOLLO_PROJECT_NAME", "Project Apollo")
        API_V1_STR: str = os.getenv("APOLLO_API_V1_STR", "/api/v1")
        CORS_ORIGINS: list[str] = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
        BASE_DIR: Path = BASE_DIR
        STORAGE_DIR: Path = BASE_DIR / "storage"
        DEMUCS_MODEL: str = os.getenv("APOLLO_DEMUCS_MODEL", "htdemucs")
        DEMUCS_DEVICE: str = "cuda" if os.environ.get("CUDA_VISIBLE_DEVICES") else "auto"
        ALLOWED_EXTENSIONS: set[str] = {".mp3", ".wav", ".flac", ".ogg", ".m4a"}
        MAX_UPLOAD_SIZE_MB: int = int(os.getenv("APOLLO_MAX_UPLOAD_SIZE_MB", "100"))
        SESSION_EXPIRY_HOURS: int = int(os.getenv("APOLLO_SESSION_EXPIRY_HOURS", "24"))

    settings = FallbackSettings()  # type: ignore
