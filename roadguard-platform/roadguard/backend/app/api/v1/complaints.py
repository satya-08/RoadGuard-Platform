import os
import uuid
import shutil
import random
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from roadguard.backend.app.core.config import settings
from roadguard.backend.app.core.database import get_db
from roadguard.backend.app.models.entities import Complaint, AIDetection, RoadSegment, AuditLog, User, MaintenanceTask
from roadguard.backend.app.models.enums import UserRole, IssueStatusEnum, PriorityTierEnum
from roadguard.backend.app.schemas.complaint import ComplaintCreate, ComplaintResponse, ComplaintStatusUpdate
from roadguard.backend.app.schemas.ai import AIAnalysisResponse
from roadguard.backend.app.api.deps import get_current_user, get_current_user_optional, require_roles
from roadguard.backend.app.ai.pipeline import run_ai_inference
from roadguard.backend.app.gis.engine import gis_engine, haversine_distance_meters
from roadguard.backend.app.priority.engine import (
    calculate_defect_severity,
    calculate_maintenance_priority,
    calculate_pci_score
)

from roadguard.backend.app.core.mongodb import log_mongo_audit, log_mongo_complaint

router = APIRouter(prefix="/complaints", tags=["Citizen Complaints & Inspection Reports"])

def generate_reference_no() -> str:
    timestamp_part = datetime.now().strftime("%y%m%d")
    random_part = "".join(random.choices("0123456789ABCDEF", k=4))
    return f"RG-{timestamp_part}-{random_part}"

@router.post("/analyze-upload", response_model=AIAnalysisResponse)
async def analyze_uploaded_file(file: UploadFile = File(...)):
    """
    Step 1 of Citizen Workflow:
    Accepts optical road image, validates format/integrity, runs AI YOLOv8 perception,
    evaluates defect severity & ASTM D6433 PCI score, and generates Grad-CAM/Sobel XAI heatmap.
    """
    allowed_exts = [".jpg", ".jpeg", ".png", ".webp"]
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed formats: {allowed_exts}"
        )

    file_id = str(uuid.uuid4())[:8]
    raw_filename = f"raw_{file_id}{ext}"
    raw_path = settings.RAW_DIR / raw_filename

    try:
        with open(raw_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save uploaded file: {str(e)}"
        )

    # Run AI inference & XAI explanation
    ai_result = run_ai_inference(str(raw_path))
    ai_result["raw_image_url"] = f"/uploads/raw/{raw_filename}"
    return ai_result

@router.post("/submit", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
def submit_complaint(
    payload: ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Step 2 of Citizen Workflow:
    Submits complaint with location coordinates, AI detections, and road match.
    Performs spatial snapping to jurisdiction and computes Maintenance Priority Score (MPS).
    Accepts both authenticated citizens and anonymous submissions.
    """
    # 1. Geospatial Road Snapping
    snap = gis_engine.snap_coordinate(payload.latitude, payload.longitude)
    
    # 2. Duplicate Detection (within 35 meters and past 7 days)
    seven_days_ago = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=7)
    recent_nearby = db.query(Complaint).filter(
        Complaint.created_at >= seven_days_ago,
        Complaint.status.notin_([IssueStatusEnum.CLOSED.value, IssueStatusEnum.REJECTED.value])
    ).all()
    
    is_dup = False
    dup_parent_id = None
    for cand in recent_nearby:
        dist = haversine_distance_meters(payload.latitude, payload.longitude, cand.latitude, cand.longitude)
        if dist <= 35.0:
            is_dup = True
            dup_parent_id = cand.id
            cand.duplicate_count = (cand.duplicate_count or 0) + 1
            break

    # 3. Compute Priority Score
    hierarchy_for_scoring = snap.get("hierarchy", "URBAN")
    priority_calc = calculate_maintenance_priority(
        peak_severity=payload.peak_severity or 0.0,
        segment_density=payload.peak_severity or 0.0,
        road_hierarchy=hierarchy_for_scoring,
        is_near_vulnerable_spot=False,
        complaint_count=1
    )

    ref_no = generate_reference_no()
    complaint_id = str(uuid.uuid4())
    
    # Resolve or create matched road segment in DB
    matched_seg_db = None
    if snap.get("segment_code"):
        matched_seg_db = db.query(RoadSegment).filter(RoadSegment.segment_code == snap["segment_code"]).first()
        if matched_seg_db:
            matched_seg_db.total_defects = (matched_seg_db.total_defects or 0) + len(payload.detections or [])
            # Update segment health
            if payload.peak_severity and payload.peak_severity > 0.5:
                matched_seg_db.health_score = max(20.0, (matched_seg_db.health_score or 100.0) - 10.0)
                matched_seg_db.condition_status = "Poor" if matched_seg_db.health_score < 45 else "Moderate"

    complaint = Complaint(
        id=complaint_id,
        reference_no=ref_no,
        user_id=current_user.id if current_user else None,
        description=payload.description,
        image_url=payload.image_url,
        annotated_image_url=payload.annotated_image_url,
        xai_heatmap_url=payload.xai_heatmap_url,
        video_url=payload.video_url,
        latitude=payload.latitude,
        longitude=payload.longitude,
        address=payload.address or snap.get("road_name") or f"{payload.latitude:.4f}, {payload.longitude:.4f}",
        matched_segment_id=matched_seg_db.id if matched_seg_db else None,
        road_name=snap.get("road_name"),
        road_hierarchy=snap.get("hierarchy"),
        jurisdiction=snap.get("jurisdiction"),
        responsible_authority=snap.get("responsible_authority"),
        division=snap.get("division"),
        gis_match_distance=snap.get("distance_meters"),
        requires_manual_routing=snap.get("requires_manual_routing", False),
        peak_severity=payload.peak_severity or 0.0,
        severity_level=payload.severity_level or "Low",
        priority_score=priority_calc["priority_score"],
        priority_tier=priority_calc["priority_tier"],
        pci_score=payload.pci_score or 100.0,
        status=IssueStatusEnum.SUBMITTED.value if not is_dup else IssueStatusEnum.DUPLICATE.value,
        is_duplicate=is_dup,
        duplicate_of_id=dup_parent_id
    )
    db.add(complaint)
    db.flush()

    # Save individual AI detections
    if payload.detections:
        for det in payload.detections:
            # Handle both Pydantic and Dict structures gracefully
            bbox = getattr(det, 'bbox', None)
            xmin = getattr(bbox, 'xmin', None) if bbox else 0.0
            ymin = getattr(bbox, 'ymin', None) if bbox else 0.0
            xmax = getattr(bbox, 'xmax', None) if bbox else 0.0
            ymax = getattr(bbox, 'ymax', None) if bbox else 0.0
            
            if isinstance(bbox, dict):
                xmin = bbox.get('xmin', 0.0)
                ymin = bbox.get('ymin', 0.0)
                xmax = bbox.get('xmax', 0.0)
                ymax = bbox.get('ymax', 0.0)

            d_obj = AIDetection(
                id=str(uuid.uuid4()),
                complaint_id=complaint.id,
                defect_class=getattr(det, 'defect_class', 'Pothole'),
                confidence=getattr(det, 'confidence', 0.8),
                bbox_xmin=float(xmin),
                bbox_ymin=float(ymin),
                bbox_xmax=float(xmax),
                bbox_ymax=float(ymax),
                normalized_area=float(getattr(det, 'normalized_area', 0.0)),
                aspect_ratio=float(getattr(det, 'aspect_ratio', 1.0)),
                severity_score=float(getattr(det, 'severity_score', 0.0)),
                severity_level=getattr(det, 'severity_level', 'Low')
            )
            db.add(d_obj)

    # Audit log
    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=current_user.id if current_user else "anonymous-citizen",
        user_email=current_user.email if current_user else "citizen@anonymous.local",
        action="SUBMIT_COMPLAINT",
        entity_type="Complaint",
        entity_id=complaint.id,
        details=f"Complaint lodged {ref_no} at ({payload.latitude}, {payload.longitude}). Priority: {priority_calc['priority_tier']}"
    )
    db.add(audit)
    db.commit()
    db.refresh(complaint)

    # Dual Database Sync: MongoDB Atlas / Local
    log_mongo_audit(
        action="SUBMIT_COMPLAINT",
        entity_type="Complaint",
        entity_id=complaint.id,
        user_email=current_user.email if current_user else "citizen@anonymous.local",
        user_id=current_user.id if current_user else None,
        details=f"Complaint lodged {ref_no}",
        metadata={"priority_score": complaint.priority_score, "pci_score": complaint.pci_score}
    )
    log_mongo_complaint({
        "id": complaint.id,
        "reference_no": complaint.reference_no,
        "latitude": complaint.latitude,
        "longitude": complaint.longitude,
        "address": complaint.address,
        "severity_level": complaint.severity_level,
        "priority_tier": complaint.priority_tier,
        "status": complaint.status,
        "responsible_authority": complaint.responsible_authority,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return complaint

@router.get("/track/{reference_no}", response_model=ComplaintResponse)
def track_complaint_public(reference_no: str, db: Session = Depends(get_db)):
    """
    Public tracking endpoint: enables citizens to track repair progress using reference number.
    Does not expose sensitive personal info.
    """
    c = db.query(Complaint).filter(Complaint.reference_no == reference_no).first()
    if not c:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No complaint record found matching reference number '{reference_no}'."
        )
    return c

@router.get("/my-complaints", response_model=List[ComplaintResponse])
def get_user_complaints(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Complaint).filter(Complaint.user_id == current_user.id).order_by(desc(Complaint.created_at)).all()

@router.get("", response_model=List[ComplaintResponse])
def list_complaints(
    status_filter: Optional[str] = Query(None, alias="status"),
    authority: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List complaints with role-based filtering:
    - Authorities only see records routed to their authorized jurisdiction.
    - Admins and inspectors can see all records.
    """
    query = db.query(Complaint)
    
    # Enforce role-based jurisdiction scoping (includes records assigned to All Authorities)
    if current_user.role == UserRole.NHAI_AUTHORITY.value:
        query = query.filter((Complaint.responsible_authority.ilike("%NHAI%")) | (Complaint.responsible_authority.ilike("%All%")))
    elif current_user.role == UserRole.STATE_HIGHWAY_AUTHORITY.value:
        query = query.filter((Complaint.responsible_authority.ilike("%PWD%")) | (Complaint.responsible_authority.ilike("%All%")))
    elif current_user.role == UserRole.MUNICIPAL_AUTHORITY.value:
        query = query.filter((Complaint.responsible_authority.ilike("%Municipal%")) | (Complaint.responsible_authority.ilike("%All%")))
    elif current_user.role == UserRole.CITIZEN.value:
        # Citizens see their own or public reports
        query = query.filter((Complaint.user_id == current_user.id) | (Complaint.status != IssueStatusEnum.REJECTED.value))

    if status_filter:
        query = query.filter(Complaint.status == status_filter)
    if authority:
        query = query.filter(Complaint.responsible_authority.ilike(f"%{authority}%"))
    if priority:
        query = query.filter(Complaint.priority_tier == priority)

    return query.order_by(desc(Complaint.created_at)).offset(offset).limit(limit).all()

@router.get("/{complaint_id}", response_model=ComplaintResponse)
def get_complaint_by_id(
    complaint_id: str,
    db: Session = Depends(get_db)
):
    c = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return c

@router.patch("/{complaint_id}/status")
def update_complaint_status(
    complaint_id: str,
    update: ComplaintStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates complaint status, reassignment, or rejection with full audit logging.
    Enforces role authorization (Citizens cannot update status).
    """
    if current_user.role == UserRole.CITIZEN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Citizens are not authorized to update complaint statuses or reject grievances."
        )

    c = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    old_status = c.status
    c.status = update.status
    if update.rejection_reason:
        c.rejection_reason = update.rejection_reason
    if update.assigned_authority:
        c.responsible_authority = update.assigned_authority

    # If dispatched to authority as Assigned, mint maintenance work order if not present
    if update.status == IssueStatusEnum.ASSIGNED.value and not c.task:
        task_code = f"WO-{datetime.now().strftime('%y%m%d')}-{str(uuid.uuid4())[:4].upper()}"
        task = MaintenanceTask(
            id=str(uuid.uuid4()),
            task_code=task_code,
            complaint_id=c.id,
            segment_id=c.matched_segment_id,
            assigned_authority=c.responsible_authority,
            created_by_user_id=current_user.id,
            status=IssueStatusEnum.ASSIGNED.value,
            priority_level=c.priority_tier,
            work_instructions=f"Routed and dispatched by Field Inspector {current_user.full_name} for immediate execution."
        )
        db.add(task)

    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        user_email=current_user.email,
        action="STATUS_CHANGE",
        entity_type="Complaint",
        entity_id=c.id,
        details=f"Status transitioned from '{old_status}' to '{update.status}' by {current_user.full_name} ({current_user.role})"
    )
    db.add(audit)
    db.commit()

    # Dual Database Sync: MongoDB
    log_mongo_audit(
        action="STATUS_CHANGE",
        entity_type="Complaint",
        entity_id=c.id,
        user_email=current_user.email,
        user_id=current_user.id,
        details=f"Status: {old_status} -> {update.status}",
        metadata={"old_status": old_status, "new_status": update.status, "rejection_reason": update.rejection_reason}
    )

    return {"message": "Status updated successfully", "old_status": old_status, "new_status": c.status}
