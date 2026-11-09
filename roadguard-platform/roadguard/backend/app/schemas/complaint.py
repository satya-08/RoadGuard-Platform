from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from roadguard.backend.app.schemas.ai import DetectionItem
from roadguard.backend.app.schemas.gis import SnapResultResponse

class ComplaintCreate(BaseModel):
    description: Optional[str] = None
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    address: Optional[str] = None
    image_url: str
    annotated_image_url: Optional[str] = None
    xai_heatmap_url: Optional[str] = None
    video_url: Optional[str] = None
    
    # Pre-calculated AI & GIS results
    peak_severity: Optional[float] = 0.0
    severity_level: Optional[str] = "Low"
    pci_score: Optional[float] = 100.0
    detections: Optional[List[DetectionItem]] = []
    
    matched_segment_id: Optional[str] = None
    road_name: Optional[str] = None
    road_hierarchy: Optional[str] = None
    jurisdiction: Optional[str] = None
    responsible_authority: Optional[str] = None
    division: Optional[str] = None
    gis_match_distance: Optional[float] = None
    requires_manual_routing: Optional[bool] = False

class ComplaintStatusUpdate(BaseModel):
    status: str
    rejection_reason: Optional[str] = None
    assigned_authority: Optional[str] = None
    assigned_to_user_id: Optional[str] = None
    notes: Optional[str] = None

class ComplaintResponse(BaseModel):
    id: str
    reference_no: str
    user_id: Optional[str] = None
    description: Optional[str] = None
    image_url: str
    annotated_image_url: Optional[str] = None
    xai_heatmap_url: Optional[str] = None
    video_url: Optional[str] = None
    latitude: float
    longitude: float
    address: Optional[str] = None
    
    matched_segment_id: Optional[str] = None
    road_name: Optional[str] = None
    road_hierarchy: Optional[str] = None
    jurisdiction: Optional[str] = None
    responsible_authority: Optional[str] = None
    division: Optional[str] = None
    requires_manual_routing: bool
    
    peak_severity: float
    severity_level: str
    priority_score: float
    priority_tier: str
    pci_score: float
    
    status: str
    rejection_reason: Optional[str] = None
    is_duplicate: bool
    duplicate_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
