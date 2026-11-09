from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class CoordinateInput(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    tolerance_meters: Optional[float] = 250.0

class RoadSegmentResponse(BaseModel):
    id: str
    segment_code: str
    road_name: str
    road_hierarchy: str
    jurisdiction: str
    responsible_authority: str
    division: Optional[str] = None
    ward_number: Optional[int] = None
    start_lat: float
    start_lon: float
    end_lat: float
    end_lon: float
    length_meters: float
    speed_limit_kmph: int
    health_score: float
    condition_status: str
    total_defects: int

    class Config:
        from_attributes = True

class SnapResultResponse(BaseModel):
    matched: bool
    distance_meters: float
    segment_id: Optional[str] = None
    road_name: Optional[str] = None
    hierarchy: Optional[str] = None
    jurisdiction: Optional[str] = None
    responsible_authority: Optional[str] = None
    division: Optional[str] = None
    ward_no: Optional[int] = None
    snapped_lat: Optional[float] = None
    snapped_lon: Optional[float] = None
    requires_manual_routing: bool = False
    message: Optional[str] = None
