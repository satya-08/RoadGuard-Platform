from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field

class MaintenanceTaskCreate(BaseModel):
    complaint_id: str
    assigned_authority: str
    assigned_to_user_id: Optional[str] = None
    target_completion_date: Optional[datetime] = None
    priority_level: Optional[str] = "SCHEDULED_REPAIR"
    work_instructions: Optional[str] = None

class MaintenanceTaskUpdate(BaseModel):
    status: Optional[str] = None
    target_completion_date: Optional[datetime] = None
    contractor_notes: Optional[str] = None
    completion_date: Optional[datetime] = None

class MaintenanceTaskResponse(BaseModel):
    id: str
    task_code: str
    complaint_id: str
    segment_id: Optional[str] = None
    assigned_authority: str
    assigned_to_user_id: Optional[str] = None
    status: str
    target_completion_date: Optional[datetime] = None
    priority_level: str
    work_instructions: Optional[str] = None
    contractor_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class VerificationSubmission(BaseModel):
    task_id: str
    after_image_url: str
    inspector_notes: Optional[str] = None

class VerificationApproval(BaseModel):
    verification_status: str # "Verification Passed", "Verification Failed", "Inconclusive - Manual Inspection Required"
    inspector_notes: Optional[str] = None

class VerificationResponse(BaseModel):
    id: str
    task_id: str
    complaint_id: str
    before_image_url: str
    after_image_url: str
    annotated_after_url: Optional[str] = None
    verification_status: str
    ai_confidence_after: float
    defects_count_after: int
    ai_recheck_notes: Optional[str] = None
    inspector_notes: Optional[str] = None
    verified_at: datetime

    class Config:
        from_attributes = True
