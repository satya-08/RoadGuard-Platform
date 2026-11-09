import os
import psutil
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from roadguard.backend.app.core.config import settings
from roadguard.backend.app.core.database import get_db, engine
from roadguard.backend.app.models.entities import User, AuditLog, ScoringConfig
from roadguard.backend.app.models.enums import UserRole
from roadguard.backend.app.schemas.auth import UserResponse
from roadguard.backend.app.api.deps import require_roles
from roadguard.backend.app.ai.pipeline import get_yolo_model
from roadguard.backend.app.core.mongodb import get_mongodb_status

router = APIRouter(prefix="/admin", tags=["System Administration, Auditing & Health Telemetry"])

@router.get("/users", response_model=List[UserResponse])
def list_system_users(
    current_user: User = Depends(require_roles([UserRole.ADMIN.value])),
    db: Session = Depends(get_db)
):
    return db.query(User).order_by(User.created_at).all()

@router.patch("/users/{user_id}/status")
def toggle_user_status(
    user_id: str,
    is_active: bool,
    current_user: User = Depends(require_roles([UserRole.ADMIN.value])),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = is_active
    db.commit()
    return {"message": f"User {user.email} active status set to {is_active}"}

@router.get("/audit-logs")
def get_audit_logs(
    limit: int = 100,
    current_user: User = Depends(require_roles([UserRole.ADMIN.value])),
    db: Session = Depends(get_db)
):
    logs = db.query(AuditLog).order_by(desc(AuditLog.created_at)).limit(limit).all()
    return logs

@router.get("/system-health")
def get_system_health(
    current_user: User = Depends(require_roles([UserRole.ADMIN.value, UserRole.FIELD_INSPECTOR.value]))
):
    """
    Returns real telemetry on model loading, host resources, and storage metrics.
    """
    model = get_yolo_model()
    model_loaded = model is not None
    model_classes = model.names if model else {}

    # CPU and Memory
    cpu_percent = psutil.cpu_percent(interval=0.1)
    memory = psutil.virtual_memory()

    # Uploads folder size
    upload_size_mb = 0.0
    for root, dirs, files in os.walk(settings.UPLOAD_DIR):
        for f in files:
            upload_size_mb += os.path.getsize(os.path.join(root, f)) / (1024 * 1024)

    return {
        "status": "Healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": {
            "driver": "SQLite (Default Local) / MySQL 8.x Compatible",
            "url_safe": settings.DATABASE_URL.split("@")[-1] if "@" in settings.DATABASE_URL else "Local Storage"
        },
        "ai_model": {
            "model_path": str(settings.MODEL_PATH),
            "loaded": model_loaded,
            "classes": model_classes,
            "confidence_threshold": settings.CONFIDENCE_THRESHOLD,
            "iou_threshold": settings.IOU_THRESHOLD,
            "blur_filter_threshold": settings.BLUR_THRESHOLD
        },
        "system_telemetry": {
            "cpu_usage_percent": cpu_percent,
            "ram_usage_percent": memory.percent,
            "ram_available_gb": round(memory.available / (1024**3), 2),
            "uploads_storage_mb": round(upload_size_mb, 2)
        },
        "mongodb": get_mongodb_status()
    }

@router.get("/mongodb-status")
def get_mongo_status(
    current_user: User = Depends(require_roles([UserRole.ADMIN.value]))
):
    return get_mongodb_status()

@router.get("/scoring-config")
def get_scoring_config(
    current_user: User = Depends(require_roles([UserRole.ADMIN.value])),
    db: Session = Depends(get_db)
):
    config = db.query(ScoringConfig).filter(ScoringConfig.is_active == True).first()
    if not config:
        config = ScoringConfig()
        db.add(config)
        db.commit()
        db.refresh(config)
    return config
