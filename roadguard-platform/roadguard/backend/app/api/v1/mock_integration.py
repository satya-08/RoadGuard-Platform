import uuid
from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from roadguard.backend.app.api.deps import get_current_user
from roadguard.backend.app.models.entities import User

router = APIRouter(prefix="/integrations", tags=["External Government Integration Adapters (Demo)"])

class MockGovSubmissionRequest(BaseModel):
    internal_complaint_id: str
    target_portal: str # "CPGRAMS", "NHAI_RAH_BHAROSA", "ANDHRA_SPANDANA"
    road_name: str
    defect_description: str
    latitude: float
    longitude: float

@router.post("/mock-authority-submit")
def mock_submit_to_government_portal(
    payload: MockGovSubmissionRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Simulated Government Gateway Integration (Clearly Labeled Demonstration Only).
    Demonstrates outward dispatch to CPGRAMS, NHAI or Spandana grievance systems.
    """
    mock_id = f"MOCK-GOV-{payload.target_portal}-{datetime.now().strftime('%y%m%d')}-{uuid.uuid4().hex[:5].upper()}"
    
    return {
        "is_demonstration": True,
        "demonstration_disclaimer": "ATTENTION: This is a simulated mock integration response for academic evaluation purposes only. No actual official government agency has received this transmission.",
        "target_portal": payload.target_portal,
        "internal_complaint_id": payload.internal_complaint_id,
        "mock_reference_number": mock_id,
        "submission_timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "Awaiting External Agency Ingestion (Simulated)",
        "simulated_estimated_sla_days": 14,
        "dispatched_by_user": current_user.email
    }

@router.get("/mock-portal-status/{mock_ref_no}")
def get_mock_portal_status(mock_ref_no: str):
    """
    Returns simulated tracking status from the mock government adapter.
    """
    return {
        "is_demonstration": True,
        "mock_reference_number": mock_ref_no,
        "simulated_agency_status": "Grievance Assigned to Regional Executive Engineer (Simulated)",
        "last_synced": datetime.now(timezone.utc).isoformat(),
        "notice": "All government API connectors in RoadGuard are adapter interfaces ready for official credential binding."
    }
