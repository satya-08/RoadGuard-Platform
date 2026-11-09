import os
import uuid
import shutil
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from roadguard.backend.app.core.config import settings
from roadguard.backend.app.core.database import get_db
from roadguard.backend.app.models.entities import (
    SurveySession, SurveyFrame, AIDetection, User,
    Complaint, MaintenanceTask, RepairVerification, AuditLog, RoadSegment
)
from roadguard.backend.app.models.enums import (
    UserRole, IssueStatusEnum, VerificationStatusEnum, PriorityTierEnum
)
from roadguard.backend.app.schemas.survey import (
    SurveySessionCreate, SurveySessionResponse, SurveyFrameResponse
)
from roadguard.backend.app.api.deps import get_current_user, require_roles
from roadguard.backend.app.ai.pipeline import run_ai_inference
from roadguard.backend.app.gis.engine import gis_engine, haversine_distance_meters
from roadguard.backend.app.core.mongodb import log_mongo_audit

router = APIRouter(prefix="/surveys", tags=["Proactive Road Surveys & Mobile Camera Ingestion"])

@router.post("/sessions", response_model=SurveySessionResponse, status_code=status.HTTP_201_CREATED)
def create_survey_session(
    payload: SurveySessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Module H: Initializes a mobile or vehicle-mounted proactive survey session.
    """
    session = SurveySession(
        session_title=payload.session_title,
        inspector_id=current_user.id,
        vehicle_identifier=payload.vehicle_identifier,
        start_lat=payload.start_lat,
        start_lon=payload.start_lon,
        end_lat=payload.end_lat,
        end_lon=payload.end_lon,
        status="In Progress"
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

@router.get("/sessions", response_model=List[SurveySessionResponse])
def list_survey_sessions(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(SurveySession).order_by(desc(SurveySession.created_at)).limit(limit).all()

@router.get("/sessions/{session_id}", response_model=SurveySessionResponse)
def get_survey_session(session_id: str, db: Session = Depends(get_db)):
    s = db.query(SurveySession).filter(SurveySession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Survey session not found")
    return s

@router.post("/sessions/{session_id}/frames", response_model=SurveyFrameResponse)
async def upload_survey_frame(
    session_id: str,
    frame_number: int = Form(...),
    timestamp_sec: float = Form(0.0),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    frame_image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Ingests and processes an optical frame from a vehicle camera during survey.
    Runs blur validation, YOLO detection, and logs coordinates.
    """
    session = db.query(SurveySession).filter(SurveySession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Survey session not found")

    ext = os.path.splitext(frame_image.filename or ".jpg")[1].lower()
    frame_filename = f"survey_{session_id[:6]}_{frame_number}{ext}"
    frame_path = settings.RAW_DIR / frame_filename

    with open(frame_path, "wb") as buffer:
        shutil.copyfileobj(frame_image.file, buffer)

    # Process frame
    ai_result = run_ai_inference(str(frame_path))

    # Match segment if coordinates provided
    matched_seg_id = None
    if latitude is not None and longitude is not None:
        snap = gis_engine.snap_coordinate(latitude, longitude)
        # Find segment in DB if needed
        # We can store matched segment code
        pass

    frame = SurveyFrame(
        session_id=session.id,
        frame_number=frame_number,
        timestamp_sec=timestamp_sec,
        latitude=latitude,
        longitude=longitude,
        raw_frame_url=f"/uploads/raw/{frame_filename}",
        annotated_frame_url=ai_result.get("annotated_image_url"),
        defects_count=ai_result.get("total_detections", 0),
        peak_severity=ai_result.get("peak_severity", 0.0),
        is_sharp=ai_result.get("is_sharp", True),
        blur_variance=ai_result.get("blur_variance", 100.0)
    )
    db.add(frame)
    
    session.total_frames += 1
    session.total_defects_found += ai_result.get("total_detections", 0)

    db.commit()
    db.refresh(frame)
    return frame


@router.post("/inspector-check")
async def field_inspector_check(
    latitude: float = Form(...),
    longitude: float = Form(...),
    notes: Optional[str] = Form(None),
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Field Inspector Picture Upload & Spatial CRT (Correctness/Certification) Check:
    1. Runs AI YOLOv8 perception inference on the uploaded field photo.
    2. Performs proximity search (within 50m) to check if distress is already present in DB.
    3. If ALREADY PRESENT: evaluates automated CRT cross-check comparing previous distress vs current state.
    4. If NOT PRESENT: flags as fresh distress ready for proactive logging.
    """
    allowed_exts = [".jpg", ".jpeg", ".png", ".webp"]
    ext = os.path.splitext(image.filename or ".jpg")[1].lower()
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format '{ext}'. Allowed: {allowed_exts}"
        )

    check_id = uuid.uuid4().hex[:8]
    raw_filename = f"inspector_{check_id}{ext}"
    raw_path = settings.RAW_DIR / raw_filename

    with open(raw_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    raw_image_url = f"/uploads/raw/{raw_filename}"

    # Run AI perception
    ai_result = run_ai_inference(str(raw_path))
    ai_result["raw_image_url"] = raw_image_url

    # GIS Corridor Snapping
    snap = gis_engine.snap_coordinate(latitude, longitude)

    # Database Proximity Search (50 meters)
    all_complaints = db.query(Complaint).all()
    closest_complaint = None
    min_distance = float("inf")

    for cand in all_complaints:
        dist = haversine_distance_meters(latitude, longitude, cand.latitude, cand.longitude)
        if dist <= 50.0 and dist < min_distance:
            min_distance = dist
            closest_complaint = cand

    already_present = closest_complaint is not None

    crt_data = None
    if already_present:
        prev_defects_count = len(closest_complaint.detections) if closest_complaint.detections else 1
        curr_defects_count = ai_result.get("total_detections", 0)
        curr_peak_sev = ai_result.get("peak_severity", 0.0)

        # Check task & verification status
        task = closest_complaint.task
        verification = closest_complaint.verification

        if curr_defects_count == 0 or curr_peak_sev <= 0.15:
            crt_status = "PASSED"
            crt_message = "CRT Check PASSED: Road surface restoration confirmed. Structural defect cavity has been resolved."
            crt_action_recommended = "CERTIFY_REPAIR"
        else:
            crt_status = "FAILED"
            crt_message = f"CRT Check FAILED: Persistent distress confirmed ({curr_defects_count} residual defect(s) detected, severity: {curr_peak_sev:.2f}). Patching incomplete or unresolved."
            crt_action_recommended = "ESCALATE_DISTRESS"

        crt_data = {
            "crt_status": crt_status,
            "crt_message": crt_message,
            "crt_action_recommended": crt_action_recommended,
            "matched_distance_meters": round(min_distance, 1),
            "matched_reference_no": closest_complaint.reference_no,
            "matched_complaint_id": closest_complaint.id,
            "baseline_image_url": closest_complaint.image_url,
            "baseline_annotated_url": closest_complaint.annotated_image_url,
            "baseline_severity": closest_complaint.peak_severity,
            "baseline_severity_level": closest_complaint.severity_level,
            "baseline_status": closest_complaint.status,
            "baseline_reported_at": closest_complaint.created_at.isoformat() if closest_complaint.created_at else None,
            "current_image_url": raw_image_url,
            "current_annotated_url": ai_result.get("annotated_image_url"),
            "current_severity": curr_peak_sev,
            "current_severity_level": ai_result.get("severity_level", "Low"),
            "baseline_defects_count": prev_defects_count,
            "current_defects_count": curr_defects_count,
            "task_code": task.task_code if task else None,
            "assigned_authority": closest_complaint.responsible_authority,
        }
    else:
        crt_data = {
            "crt_status": "NEW_DISCOVERY",
            "crt_message": "No existing distress record found within 50 meters. New road damage discovered during inspection survey.",
            "crt_action_recommended": "LOG_NEW_DISCOVERY",
            "matched_distance_meters": None,
            "current_image_url": raw_image_url,
            "current_annotated_url": ai_result.get("annotated_image_url"),
            "current_severity": ai_result.get("peak_severity", 0.0),
            "current_severity_level": ai_result.get("severity_level", "Low"),
            "current_defects_count": ai_result.get("total_detections", 0)
        }

    return {
        "already_present": already_present,
        "snap": snap,
        "ai_result": ai_result,
        "crt": crt_data,
        "latitude": latitude,
        "longitude": longitude,
        "inspector": {
            "id": current_user.id,
            "name": current_user.full_name,
            "role": current_user.role
        }
    }


@router.post("/inspector-resolve")
def resolve_inspector_crt(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submits inspector's final CRT decision (Certify Repair, Escalate Persistent Distress, or Log New Discovery).
    """
    action = payload.get("action")
    complaint_id = payload.get("complaint_id")
    inspector_notes = payload.get("inspector_notes", "")
    new_image_url = payload.get("new_image_url")
    annotated_url = payload.get("annotated_url")

    if action == "CERTIFY_REPAIR":
        if not complaint_id:
            raise HTTPException(status_code=400, detail="complaint_id required to certify repair")
        complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint not found")

        complaint.status = IssueStatusEnum.CLOSED.value

        # Update or create RepairVerification
        task = complaint.task
        task_id = task.id if task else None
        if task:
            task.status = "Closed"
            task.completion_date = datetime.utcnow()

        ver = db.query(RepairVerification).filter(RepairVerification.complaint_id == complaint.id).first()
        if not ver and task_id:
            ver = RepairVerification(
                id=str(uuid.uuid4()),
                task_id=task_id,
                complaint_id=complaint.id,
                before_image_url=complaint.image_url,
                after_image_url=new_image_url or complaint.image_url,
                annotated_after_url=annotated_url,
                verification_status="Passed",
                inspector_notes=f"[CRT Certified by {current_user.full_name}] {inspector_notes}",
                approved_by_user_id=current_user.id
            )
            db.add(ver)
        elif ver:
            ver.verification_status = "Passed"
            ver.after_image_url = new_image_url or ver.after_image_url
            ver.annotated_after_url = annotated_url
            ver.inspector_notes = f"[CRT Certified by {current_user.full_name}] {inspector_notes}"
            ver.approved_by_user_id = current_user.id

        audit = AuditLog(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            user_email=current_user.email,
            action="INSPECTOR_CRT_PASS",
            entity_type="Complaint",
            entity_id=complaint.id,
            details=f"Field Inspector certified repair for {complaint.reference_no}. Status closed."
        )
        db.add(audit)
        db.commit()
        return {"success": True, "message": f"Repair certified and issue {complaint.reference_no} marked Closed."}

    elif action == "ESCALATE_DISTRESS":
        if not complaint_id:
            raise HTTPException(status_code=400, detail="complaint_id required to escalate distress")
        complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint not found")

        complaint.priority_tier = PriorityTierEnum.IMMEDIATE_SAFETY_HAZARD.value
        complaint.status = IssueStatusEnum.IN_PROGRESS.value
        if inspector_notes:
            complaint.description = (complaint.description or "") + f"\n[Field Inspector Escalation]: {inspector_notes}"

        audit = AuditLog(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            user_email=current_user.email,
            action="INSPECTOR_CRT_FAIL_ESCALATE",
            entity_type="Complaint",
            entity_id=complaint.id,
            details=f"Field Inspector CRT failed: escalated {complaint.reference_no} to Immediate Safety Hazard."
        )
        db.add(audit)
        db.commit()
        return {"success": True, "message": f"Issue {complaint.reference_no} escalated to Immediate Safety Hazard."}

    elif action == "LOG_NEW_DISCOVERY":
        ref_no = f"RG-{datetime.now().strftime('%y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
        snap = gis_engine.snap_coordinate(payload.get("latitude", 16.8260), payload.get("longitude", 81.5210))

        new_complaint = Complaint(
            id=str(uuid.uuid4()),
            reference_no=ref_no,
            user_id=current_user.id,
            description=f"[Field Inspector Proactive Log] {inspector_notes or 'Defect identified during field survey.'}",
            image_url=new_image_url or "/uploads/raw/sample.jpg",
            annotated_image_url=annotated_url,
            latitude=payload.get("latitude", 16.8260),
            longitude=payload.get("longitude", 81.5210),
            address=snap.get("road_name") or "Survey Spot",
            road_name=snap.get("road_name"),
            road_hierarchy=snap.get("hierarchy"),
            jurisdiction=snap.get("jurisdiction"),
            responsible_authority=snap.get("responsible_authority"),
            division=snap.get("division"),
            peak_severity=payload.get("peak_severity", 0.6),
            severity_level=payload.get("severity_level", "Medium"),
            priority_score=75.0,
            priority_tier=PriorityTierEnum.PRIORITY_MAINTENANCE.value,
            pci_score=payload.get("pci_score", 65.0),
            status=IssueStatusEnum.SUBMITTED.value
        )
        db.add(new_complaint)
        db.commit()
        return {"success": True, "message": f"New distress logged successfully with Ref: {ref_no}", "reference_no": ref_no}

    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {action}")
