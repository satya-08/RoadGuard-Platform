from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class SurveySessionCreate(BaseModel):
    session_title: str
    vehicle_identifier: Optional[str] = "Field-Survey-Vehicle-01"
    start_lat: Optional[float] = None
    start_lon: Optional[float] = None
    end_lat: Optional[float] = None
    end_lon: Optional[float] = None

class SurveyFrameResponse(BaseModel):
    id: str
    session_id: str
    frame_number: int
    timestamp_sec: float
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    raw_frame_url: str
    annotated_frame_url: Optional[str] = None
    defects_count: int
    peak_severity: float
    is_sharp: bool
    blur_variance: float

    class Config:
        from_attributes = True

class SurveySessionResponse(BaseModel):
    id: str
    session_title: str
    inspector_id: Optional[str] = None
    vehicle_identifier: Optional[str] = None
    start_lat: Optional[float] = None
    start_lon: Optional[float] = None
    end_lat: Optional[float] = None
    end_lon: Optional[float] = None
    total_frames: int
    total_defects_found: int
    status: str
    created_at: datetime
    frames: List[SurveyFrameResponse] = []

    class Config:
        from_attributes = True
