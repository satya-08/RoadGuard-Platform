import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BACKEND_DIR.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "RoadGuard"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = True
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "roadguard-super-secret-production-key-change-in-production-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{BACKEND_DIR}/roadguard.db"
    )
    # MongoDB Atlas M0 / Local MongoDB (Dual Database Integration)
    MONGODB_URI: str = os.getenv("MONGODB_URI", "")
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "roadguard_logs")
    MONGODB_ENABLED: bool = os.getenv("MONGODB_ENABLED", "true").lower() in ("true", "1", "yes")
    
    # Paths & Uploads
    UPLOAD_DIR: Path = BACKEND_DIR / "uploads"
    RAW_DIR: Path = BACKEND_DIR / "uploads" / "raw"
    ANNOTATED_DIR: Path = BACKEND_DIR / "uploads" / "annotated"
    XAI_DIR: Path = BACKEND_DIR / "uploads" / "xai"
    REPAIRS_DIR: Path = BACKEND_DIR / "uploads" / "repairs"
    
    # AI Perception Model
    DEFAULT_MODEL_PATH: Path = ROOT_DIR / "ml" / "checkpoints" / "roadsense_best.pt"
    MODEL_PATH: str = os.getenv("MODEL_PATH", str(DEFAULT_MODEL_PATH))
    CONFIDENCE_THRESHOLD: float = 0.25
    IOU_THRESHOLD: float = 0.45
    BLUR_THRESHOLD: float = 80.0
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "*"
    ]
    
    # Prioritization AHP Weights
    W_SEVERITY: float = 0.35
    W_DENSITY: float = 0.25
    W_ROAD_HIERARCHY: float = 0.20
    W_LOCATION_RISK: float = 0.10
    W_COMPLAINTS: float = 0.10

    class Config:
        case_sensitive = True
        extra = "ignore"

settings = Settings()

# Ensure directories exist
for folder in [settings.UPLOAD_DIR, settings.RAW_DIR, settings.ANNOTATED_DIR, settings.XAI_DIR, settings.REPAIRS_DIR]:
    folder.mkdir(parents=True, exist_ok=True)
