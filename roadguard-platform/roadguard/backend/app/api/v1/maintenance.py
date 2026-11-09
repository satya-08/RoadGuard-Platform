import os
import uuid
import shutil
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from roadguard.backend.app.core.config import settings
from roadguard.backend.app.core.database import get_db
from roadguard.backend.app.models.entities import (
    MaintenanceTask, Complaint, RepairVerification, AuditLog, User
)
from roadguard.backend.app.models.enums import (
    UserRole, IssueStatusEnum, VerificationStatusEnum, PriorityTierEnum
)
from roadguard.backend.app.schemas.maintenance import (
    MaintenanceTaskCreate, MaintenanceTaskUpdate, MaintenanceTaskResponse,
    VerificationSubmission, VerificationApproval, VerificationResponse
)
from roadguard.backend.app.api.deps import get_current_user, require_roles
from roadguard.backend.app.ai.pipeline import run_ai_inference
from roadguard.backend.app.core.mongodb import log_mongo_audit

router = APIRouter(prefix="/maintenance", tags=["Maintenance Workflow & Post-Repair Verification"])

@router.post("/tasks", response_model=MaintenanceTaskResponse, status_code=status.HTTP_201_CREATED)
def create_maintenance_task(
    payload: MaintenanceTaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Assigns an inspected complaint to a maintenance contractor or engineering team.
    Enforces authorization, validates complaint eligibility, and generates work order.
    """
    if current_user.role == UserRole.CITIZEN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Citizens are not authorized to dispatch maintenance work orders."
        )

    complaint = db.query(Complaint).filter(Complaint.id == payload.complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint record not found")

    if complaint.status in [IssueStatusEnum.CLOSED.value, IssueStatusEnum.REJECTED.value]:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot dispatch work order for a complaint that is already {complaint.status}."
        )

    existing_task = db.query(MaintenanceTask).filter(MaintenanceTask.complaint_id == payload.complaint_id).first()
    if existing_task:
        raise HTTPException(
            status_code=400, 
            detail=f"Work order '{existing_task.task_code}' is already assigned for this complaint."
        )

    task_id = str(uuid.uuid4())
    task_code = f"WO-{datetime.now().strftime('%y%m%d')}-{str(uuid.uuid4())[:4].upper()}"
    task = MaintenanceTask(
        id=task_id,
        task_code=task_code,
        complaint_id=complaint.id,
        segment_id=complaint.matched_segment_id,
        assigned_authority=payload.assigned_authority,
        assigned_to_user_id=payload.assigned_to_user_id,
        created_by_user_id=current_user.id,
        status=IssueStatusEnum.ASSIGNED.value,
        target_completion_date=payload.target_completion_date,
        priority_level=payload.priority_level or complaint.priority_tier,
        work_instructions=payload.work_instructions
    )
    db.add(task)
    
    # Transition complaint status to ASSIGNED
    complaint.status = IssueStatusEnum.ASSIGNED.value
    db.flush() # Ensures task.id and state are flushed before audit logging
    
    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        user_email=current_user.email,
        action="ASSIGN_MAINTENANCE_TASK",
        entity_type="MaintenanceTask",
        entity_id=task.id,
        details=f"Work order {task_code} assigned to {payload.assigned_authority}."
    )
    db.add(audit)
    db.commit()
    db.refresh(task)

    # Dual Database Sync: MongoDB
    log_mongo_audit(
        action="ASSIGN_MAINTENANCE_TASK",
        entity_type="MaintenanceTask",
        entity_id=task.id,
        user_email=current_user.email,
        user_id=current_user.id,
        details=f"Work order {task_code} dispatched to {payload.assigned_authority}",
        metadata={"complaint_id": complaint.id, "priority_level": task.priority_level}
    )

    return task

@router.get("/tasks", response_model=List[MaintenanceTaskResponse])
def list_maintenance_tasks(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(MaintenanceTask)
    
    # Scoping by role
    if current_user.role == UserRole.MAINTENANCE_CONTRACTOR.value:
        query = query.filter(
            (MaintenanceTask.assigned_to_user_id == current_user.id) |
            (MaintenanceTask.assigned_authority.ilike(f"%{current_user.department or ''}%"))
        )
    elif current_user.role == UserRole.NHAI_AUTHORITY.value:
        query = query.filter(MaintenanceTask.assigned_authority.ilike("%NHAI%"))
    elif current_user.role == UserRole.STATE_HIGHWAY_AUTHORITY.value:
        query = query.filter(MaintenanceTask.assigned_authority.ilike("%PWD%"))
    elif current_user.role == UserRole.MUNICIPAL_AUTHORITY.value:
        query = query.filter(MaintenanceTask.assigned_authority.ilike("%Municipal%"))

    if status_filter:
        query = query.filter(MaintenanceTask.status == status_filter)

    return query.order_by(desc(MaintenanceTask.created_at)).all()

@router.patch("/tasks/{task_id}", response_model=MaintenanceTaskResponse)
def update_maintenance_task(
    task_id: str,
    update: MaintenanceTaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    task = db.query(MaintenanceTask).filter(MaintenanceTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Maintenance task not found")
    
    if update.status:
        task.status = update.status
        # Sync complaint status
        if task.complaint:
            task.complaint.status = update.status
    if update.contractor_notes:
        task.contractor_notes = update.contractor_notes
    if update.completion_date:
        task.completion_date = update.completion_date
    if update.target_completion_date:
        task.target_completion_date = update.target_completion_date

    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        user_email=current_user.email,
        action="UPDATE_TASK_STATUS",
        entity_type="MaintenanceTask",
        entity_id=task.id,
        details=f"Task {task.task_code} updated to status {task.status}"
    )
    db.add(audit)
    db.commit()
    db.refresh(task)

    log_mongo_audit(
        action="UPDATE_TASK_STATUS",
        entity_type="MaintenanceTask",
        entity_id=task.id,
        user_email=current_user.email,
        user_id=current_user.id,
        details=f"Task {task.task_code} status: {task.status}",
        metadata={"status": task.status}
    )

    return task

@router.post("/verify-repair", response_model=VerificationResponse)
async def submit_repair_verification(
    task_id: str = Form(...),
    inspector_notes: Optional[str] = Form(None),
    after_image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Module K: Post-Repair Verification Workflow
    Uploads after-repair evidence, runs AI detection re-check, and validates repair outcome.
    """
    task = db.query(MaintenanceTask).filter(MaintenanceTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Maintenance task not found")

    complaint = task.complaint
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint linked to task not found")

    # Save after repair image
    ext = os.path.splitext(after_image.filename or ".jpg")[1].lower()
    rep_filename = f"repair_{task.task_code}_{uuid.uuid4().hex[:6]}{ext}"
    rep_path = settings.REPAIRS_DIR / rep_filename
    
    with open(rep_path, "wb") as buffer:
        shutil.copyfileobj(after_image.file, buffer)

    after_image_url = f"/uploads/repairs/{rep_filename}"

    # Run AI re-inference on after-repair image
    ai_recheck = run_ai_inference(str(rep_path))
    defects_found_after = ai_recheck["total_detections"]
    peak_sev_after = ai_recheck["peak_severity"]
    is_sharp = ai_recheck.get("is_sharp", True)

    # Automated verification evaluation logic
    if not is_sharp:
        v_status = VerificationStatusEnum.INCONCLUSIVE.value
        recheck_notes = "Image exhibited significant motion blur. Optical quality insufficient to automatically certify road surface restoration."
    elif defects_found_after == 0 or peak_sev_after <= 0.15:
        v_status = VerificationStatusEnum.PASSED.value
        recheck_notes = f"Visual pavement inspection passed. Structural defect cavity resolved. Detections after repair: {defects_found_after}."
    else:
        v_status = VerificationStatusEnum.FAILED.value
        recheck_notes = f"Residual distress detected ({defects_found_after} defect(s) remaining, severity: {peak_sev_after:.2f}). Patching incomplete."

    # Create verification record
    verification = db.query(RepairVerification).filter(RepairVerification.task_id == task.id).first()
    if not verification:
        verification = RepairVerification(
            id=str(uuid.uuid4()),
            task_id=task.id,
            complaint_id=complaint.id,
            before_image_url=complaint.image_url,
            after_image_url=after_image_url,
            annotated_after_url=ai_recheck.get("annotated_image_url"),
            verification_status=v_status,
            ai_confidence_after=max([d["confidence"] for d in ai_recheck.get("detections", [])], default=0.0),
            defects_count_after=defects_found_after,
            ai_recheck_notes=recheck_notes,
            inspector_notes=inspector_notes,
            approved_by_user_id=current_user.id
        )
        db.add(verification)
    else:
        verification.after_image_url = after_image_url
        verification.annotated_after_url = ai_recheck.get("annotated_image_url")
        verification.verification_status = v_status
        verification.defects_count_after = defects_found_after
        verification.ai_recheck_notes = recheck_notes
        verification.inspector_notes = inspector_notes
        verification.verified_at = datetime.now(timezone.utc).replace(tzinfo=None)

    # If verification passed, update task and complaint to CLOSED or VERIFICATION_PENDING
    if v_status == VerificationStatusEnum.PASSED.value:
        task.status = IssueStatusEnum.REPAIR_COMPLETED.value
        complaint.status = IssueStatusEnum.REPAIR_COMPLETED.value
    else:
        task.status = IssueStatusEnum.IN_PROGRESS.value
        complaint.status = IssueStatusEnum.IN_PROGRESS.value

    db.flush() # Ensure verification.id is generated before audit log

    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        user_email=current_user.email,
        action="POST_REPAIR_VERIFICATION",
        entity_type="RepairVerification",
        entity_id=verification.id,
        details=f"Verification status: '{v_status}' for task {task.task_code}"
    )
    db.add(audit)
    db.commit()
    db.refresh(verification)

    log_mongo_audit(
        action="POST_REPAIR_VERIFICATION",
        entity_type="RepairVerification",
        entity_id=verification.id,
        user_email=current_user.email,
        user_id=current_user.id,
        details=f"Verification status: {v_status} for task {task.task_code}",
        metadata={"verification_status": v_status, "defects_after": defects_found_after}
    )

    return verification

@router.post("/verifications/{verification_id}/approve")
def approve_or_reject_closure(
    verification_id: str,
    approval: VerificationApproval,
    current_user: User = Depends(require_roles([
        UserRole.MUNICIPAL_AUTHORITY.value,
        UserRole.STATE_HIGHWAY_AUTHORITY.value,
        UserRole.NHAI_AUTHORITY.value,
        UserRole.ADMIN.value
    ])),
    db: Session = Depends(get_db)
):
    """
    Authorized authority engineer gives final approval to close the complaint.
    """
    v = db.query(RepairVerification).filter(RepairVerification.id == verification_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Verification record not found")

    v.verification_status = approval.verification_status
    if approval.inspector_notes:
        v.inspector_notes = approval.inspector_notes

    task = v.task
    complaint = v.complaint

    if approval.verification_status == VerificationStatusEnum.PASSED.value:
        if task:
            task.status = IssueStatusEnum.CLOSED.value
            task.completion_date = datetime.now(timezone.utc)
        if complaint:
            complaint.status = IssueStatusEnum.CLOSED.value
    else:
        if task:
            task.status = IssueStatusEnum.REOPENED.value
        if complaint:
            complaint.status = IssueStatusEnum.REOPENED.value

    db.commit()
    return {"message": f"Verification finalized as '{approval.verification_status}'. Issue updated."}
