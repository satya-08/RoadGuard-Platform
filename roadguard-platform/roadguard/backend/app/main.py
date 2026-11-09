import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from roadguard.backend.app.core.config import settings
from roadguard.backend.app.core.database import engine, Base, SessionLocal
from roadguard.backend.app.models.entities import User, RoadSegment
from roadguard.backend.app.core.security import get_password_hash
from roadguard.backend.app.gis.engine import gis_engine
from roadguard.backend.app.api.v1.auth import router as auth_router, DEMO_ACCOUNTS
from roadguard.backend.app.api.v1.complaints import router as complaints_router
from roadguard.backend.app.api.v1.gis import router as gis_router
from roadguard.backend.app.api.v1.maintenance import router as maintenance_router
from roadguard.backend.app.api.v1.dashboard import router as dashboard_router
from roadguard.backend.app.api.v1.survey import router as survey_router
from roadguard.backend.app.api.v1.admin import router as admin_router
from roadguard.backend.app.api.v1.mock_integration import router as integration_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Explainable Deep Learning-Based Road Damage Assessment and Intelligent Maintenance Prioritization System",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Uploads
app.mount("/uploads", StaticFiles(directory=str(settings.UPLOAD_DIR)), name="uploads")

# Include API Routers
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(complaints_router, prefix=settings.API_V1_PREFIX)
app.include_router(gis_router, prefix=settings.API_V1_PREFIX)
app.include_router(maintenance_router, prefix=settings.API_V1_PREFIX)
app.include_router(dashboard_router, prefix=settings.API_V1_PREFIX)
app.include_router(survey_router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_router, prefix=settings.API_V1_PREFIX)
app.include_router(integration_router, prefix=settings.API_V1_PREFIX)

@app.on_event("startup")
def startup_db():
    # Create all tables in database
    Base.metadata.create_all(bind=engine)
    
    # Seed initial spatial network segments & demo users
    db = SessionLocal()
    try:
        # 1. Road Segments
        if db.query(RoadSegment).count() == 0:
            for s in gis_engine.segments:
                db_seg = RoadSegment(
                    segment_code=s.segment_code,
                    road_name=s.road_name,
                    road_hierarchy=s.hierarchy,
                    jurisdiction=s.jurisdiction,
                    responsible_authority=s.responsible_authority,
                    division=s.division,
                    ward_number=s.ward_no,
                    start_lat=s.start_coord[0],
                    start_lon=s.start_coord[1],
                    end_lat=s.end_coord[0],
                    end_lon=s.end_coord[1],
                    length_meters=s.length_meters,
                    health_score=85.0 if s.hierarchy == "NH" else 75.0,
                    condition_status="Good" if s.hierarchy == "NH" else "Moderate"
                )
                db.add(db_seg)
            db.commit()

        # 2. Seed Default Demo Users if empty
        if db.query(User).count() == 0:
            demo_pwd = get_password_hash("roadguard2026")
            for acct in DEMO_ACCOUNTS:
                db_user = User(
                    email=acct["email"],
                    hashed_password=demo_pwd,
                    full_name=acct["full_name"],
                    phone=acct["phone"],
                    role=acct["role"],
                    department=acct["department"],
                    is_active=True
                )
                db.add(db_user)
            db.commit()
    finally:
        db.close()

@app.get("/")
def get_root():
    return {
        "project": "RoadGuard: Explainable Deep Learning-Based Road Damage Assessment & Maintenance Prioritization System",
        "status": "Operational",
        "version": settings.VERSION,
        "docs": "/docs",
        "api_v1": settings.API_V1_PREFIX
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "RoadGuard Backend API"
    }
