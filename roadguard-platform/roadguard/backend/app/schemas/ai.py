from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class BoundingBox(BaseModel):
    xmin: float
    ymin: float
    xmax: float
    ymax: float

class DetectionItem(BaseModel):
    defect_class: str
    confidence: float
    bbox: BoundingBox
    normalized_area: float
    aspect_ratio: float
    severity_score: float
    severity_level: str

class SaliencyAnalysis(BaseModel):
    defect_type: str
    confidence: str
    severity_grade: float
    interpretability_reasons: List[str]
    action_urgency: str
    civil_recommendation: str

class AIAnalysisResponse(BaseModel):
    success: bool
    message: str
    total_detections: int
    detections: List[DetectionItem]
    peak_severity: float
    overall_severity_level: str
    pci_score: float
    raw_image_url: Optional[str] = None
    annotated_image_url: Optional[str] = None
    xai_heatmap_url: Optional[str] = None
    saliency_analysis: Optional[SaliencyAnalysis] = None
    model_version: str
    inference_time_ms: float
    is_sharp: bool
    blur_variance: float
    limitations: Optional[str] = None
