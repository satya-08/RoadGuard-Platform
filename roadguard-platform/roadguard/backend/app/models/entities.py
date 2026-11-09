import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime,
    ForeignKey, Text, Index
)
from sqlalchemy.orm import relationship

from roadguard.backend.app.core.database import Base
from roadguard.backend.app.models.enums import (
    UserRole, RoadHierarchyEnum, DefectTypeEnum,
    SeverityLevelEnum, PriorityTierEnum, IssueStatusEnum,
    VerificationStatusEnum
)

def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(120), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    role = Column(String(35), default=UserRole.CITIZEN.value, nullable=False, index=True)
    department = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    complaints = relationship("Complaint", back_populates="user", foreign_keys="Complaint.user_id")
    tasks_assigned = relationship("MaintenanceTask", back_populates="assigned_to", foreign_keys="MaintenanceTask.assigned_to_user_id")
    tasks_created = relationship("MaintenanceTask", back_populates="creator", foreign_keys="MaintenanceTask.created_by_user_id")

class RoadSegment(Base):
    __tablename__ = "road_segments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    segment_code = Column(String(50), unique=True, nullable=False, index=True)
    road_name = Column(String(150), nullable=False)
    road_hierarchy = Column(String(20), default=RoadHierarchyEnum.URBAN_ARTERIAL.value, nullable=False)
    jurisdiction = Column(String(150), nullable=False)
    responsible_authority = Column(String(150), nullable=False)
    division = Column(String(100), nullable=True)
    ward_number = Column(Integer, nullable=True)
    
    start_lat = Column(Float, nullable=False)
    start_lon = Column(Float, nullable=False)
    end_lat = Column(Float, nullable=False)
    end_lon = Column(Float, nullable=False)
    length_meters = Column(Float, default=100.0)
    speed_limit_kmph = Column(Integer, default=40)
    
    # Segment Condition & Aggregated Health
    total_defects = Column(Integer, default=0)
    health_score = Column(Float, default=100.0) # PCI equivalent [0-100]
    condition_status = Column(String(30), default="Good") # Good, Moderate, Poor, Critical, Insufficient Data
    last_inspected_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    complaints = relationship("Complaint", back_populates="matched_segment")
    tasks = relationship("MaintenanceTask", back_populates="segment")

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    reference_no = Column(String(32), unique=True, nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    description = Column(Text, nullable=True)
    
    # Images / Video Paths
    image_url = Column(String(255), nullable=False)
    annotated_image_url = Column(String(255), nullable=True)
    xai_heatmap_url = Column(String(255), nullable=True)
    video_url = Column(String(255), nullable=True)
    
    # Coordinates & GIS
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(255), nullable=True)
    
    matched_segment_id = Column(String(36), ForeignKey("road_segments.id", ondelete="SET NULL"), nullable=True)
    road_name = Column(String(150), nullable=True)
    road_hierarchy = Column(String(30), nullable=True)
    jurisdiction = Column(String(150), nullable=True)
    responsible_authority = Column(String(150), nullable=True)
    division = Column(String(100), nullable=True)
    gis_match_distance = Column(Float, nullable=True)
    requires_manual_routing = Column(Boolean, default=False)
    
    # Severity & Priority Intelligence
    peak_severity = Column(Float, default=0.0)
    severity_level = Column(String(25), default=SeverityLevelEnum.LOW.value)
    priority_score = Column(Float, default=0.0)
    priority_tier = Column(String(30), default=PriorityTierEnum.ROUTINE_MONITORING.value)
    pci_score = Column(Float, default=100.0) # ASTM D6433 PCI
    
    # Workflow Status
    status = Column(String(30), default=IssueStatusEnum.SUBMITTED.value, nullable=False, index=True)
    rejection_reason = Column(Text, nullable=True)
    
    # Deduplication & Spam Tracking
    is_duplicate = Column(Boolean, default=False)
    duplicate_of_id = Column(String(36), ForeignKey("complaints.id", ondelete="SET NULL"), nullable=True)
    duplicate_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    user = relationship("User", back_populates="complaints", foreign_keys=[user_id])
    matched_segment = relationship("RoadSegment", back_populates="complaints")
    detections = relationship("AIDetection", back_populates="complaint", cascade="all, delete-orphan")
    task = relationship("MaintenanceTask", back_populates="complaint", uselist=False)
    verification = relationship("RepairVerification", back_populates="complaint", uselist=False)

class AIDetection(Base):
    __tablename__ = "ai_detections"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    complaint_id = Column(String(36), ForeignKey("complaints.id", ondelete="CASCADE"), nullable=True, index=True)
    survey_frame_id = Column(String(36), ForeignKey("survey_frames.id", ondelete="CASCADE"), nullable=True, index=True)
    
    defect_class = Column(String(50), nullable=False)
    confidence = Column(Float, nullable=False)
    
    # Normalized Bounding Box Coordinates [0.0 - 1.0]
    bbox_xmin = Column(Float, nullable=False)
    bbox_ymin = Column(Float, nullable=False)
    bbox_xmax = Column(Float, nullable=False)
    bbox_ymax = Column(Float, nullable=False)
    
    normalized_area = Column(Float, default=0.0)
    aspect_ratio = Column(Float, default=1.0)
    severity_score = Column(Float, default=0.0)
    severity_level = Column(String(25), default=SeverityLevelEnum.LOW.value)
    
    model_version = Column(String(50), default="YOLOv8s-Custom-RoadSense")
    inference_time_ms = Column(Float, default=0.0)
    detected_at = Column(DateTime, default=utcnow, nullable=False)

    complaint = relationship("Complaint", back_populates="detections")
    survey_frame = relationship("SurveyFrame", back_populates="detections")

class MaintenanceTask(Base):
    __tablename__ = "maintenance_tasks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_code = Column(String(32), unique=True, nullable=False, index=True)
    complaint_id = Column(String(36), ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, unique=True)
    segment_id = Column(String(36), ForeignKey("road_segments.id", ondelete="SET NULL"), nullable=True)
    
    assigned_authority = Column(String(150), nullable=False)
    assigned_to_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_by_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    status = Column(String(30), default=IssueStatusEnum.ASSIGNED.value, nullable=False)
    target_completion_date = Column(DateTime, nullable=True)
    scheduled_date = Column(DateTime, nullable=True)
    completion_date = Column(DateTime, nullable=True)
    
    priority_level = Column(String(30), default=PriorityTierEnum.ROUTINE_MONITORING.value)
    work_instructions = Column(Text, nullable=True)
    contractor_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    complaint = relationship("Complaint", back_populates="task")
    segment = relationship("RoadSegment", back_populates="tasks")
    assigned_to = relationship("User", foreign_keys=[assigned_to_user_id], back_populates="tasks_assigned")
    creator = relationship("User", foreign_keys=[created_by_user_id], back_populates="tasks_created")
    verification = relationship("RepairVerification", back_populates="task", uselist=False)

class RepairVerification(Base):
    __tablename__ = "repair_verifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id = Column(String(36), ForeignKey("maintenance_tasks.id", ondelete="CASCADE"), nullable=False, unique=True)
    complaint_id = Column(String(36), ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    before_image_url = Column(String(255), nullable=False)
    after_image_url = Column(String(255), nullable=False)
    annotated_after_url = Column(String(255), nullable=True)
    
    verification_status = Column(String(50), default=VerificationStatusEnum.PENDING.value, nullable=False)
    ai_confidence_after = Column(Float, default=0.0)
    defects_count_after = Column(Integer, default=0)
    ai_recheck_notes = Column(Text, nullable=True)
    
    inspector_notes = Column(Text, nullable=True)
    approved_by_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    verified_at = Column(DateTime, default=utcnow, nullable=False)

    task = relationship("MaintenanceTask", back_populates="verification")
    complaint = relationship("Complaint", back_populates="verification")

class SurveySession(Base):
    __tablename__ = "survey_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_title = Column(String(120), nullable=False)
    inspector_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    vehicle_identifier = Column(String(50), nullable=True)
    
    start_lat = Column(Float, nullable=True)
    start_lon = Column(Float, nullable=True)
    end_lat = Column(Float, nullable=True)
    end_lon = Column(Float, nullable=True)
    
    total_frames = Column(Integer, default=0)
    total_defects_found = Column(Integer, default=0)
    status = Column(String(30), default="Completed")
    created_at = Column(DateTime, default=utcnow, nullable=False)

    frames = relationship("SurveyFrame", back_populates="session", cascade="all, delete-orphan")

class SurveyFrame(Base):
    __tablename__ = "survey_frames"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("survey_sessions.id", ondelete="CASCADE"), nullable=False)
    frame_number = Column(Integer, nullable=False)
    timestamp_sec = Column(Float, default=0.0)
    
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    segment_id = Column(String(36), ForeignKey("road_segments.id", ondelete="SET NULL"), nullable=True)
    
    raw_frame_url = Column(String(255), nullable=False)
    annotated_frame_url = Column(String(255), nullable=True)
    defects_count = Column(Integer, default=0)
    peak_severity = Column(Float, default=0.0)
    is_sharp = Column(Boolean, default=True)
    blur_variance = Column(Float, default=100.0)

    session = relationship("SurveySession", back_populates="frames")
    detections = relationship("AIDetection", back_populates="survey_frame", cascade="all, delete-orphan")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=True)
    user_email = Column(String(120), nullable=True)
    action = Column(String(60), nullable=False) # e.g. "STATUS_CHANGE", "ASSIGN_TASK", "DELETE_REPORT"
    entity_type = Column(String(40), nullable=False) # "Complaint", "Task", "Segment"
    entity_id = Column(String(36), nullable=True) # Nullable for pre-flush / general events
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

class ScoringConfig(Base):
    __tablename__ = "scoring_configs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    config_name = Column(String(60), default="AHP-Standard-v1", unique=True)
    w_severity = Column(Float, default=0.35)
    w_density = Column(Float, default=0.25)
    w_road = Column(Float, default=0.20)
    w_location = Column(Float, default=0.10)
    w_complaints = Column(Float, default=0.10)
    is_active = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
