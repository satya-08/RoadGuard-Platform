"""
RoadGuard Backend Service API
Built with FastAPI.
Implements REST endpoints connecting:
- Defect Severity Assessment
- Geospatial Snapping & Jurisdiction Routing
- Maintenance Priority Score (MPS) Dispatch
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from roadguard_core.scoring.priority_engine import (
    DefectType,
    RoadHierarchy,
    calculate_defect_severity,
    calculate_segment_density,
    calculate_maintenance_priority
)
from roadguard_core.geospatial.gps_aligner import SpatialRoadNetwork

app = FastAPI(
    title="RoadGuard Infrastructure Intelligence API",
    description="Explainable Deep Learning-Based Road Damage Assessment & Maintenance Prioritization System",
    version="1.0.0"
)

# Initialize in-memory road network instance
road_network = SpatialRoadNetwork()

class DefectAssessmentRequest(BaseModel):
    defect_type: DefectType
    normalized_area: float = Field(..., ge=0.0, le=1.0, description="Normalized pixel area of defect (0.0 to 1.0)")
    aspect_ratio: float = Field(default=1.0, ge=0.1, le=20.0, description="Bounding aspect ratio (width / height)")
    latitude: float = Field(..., description="GPS Latitude")
    longitude: float = Field(..., description="GPS Longitude")
    complaint_count: int = Field(default=0, ge=0, description="Number of citizen complaints lodged for this spot")

class SegmentPrioritizationRequest(BaseModel):
    segment_id: str
    defect_severities: List[float] = Field(..., description="List of defect severity scores in this segment")
    road_hierarchy: RoadHierarchy
    is_near_vulnerable_spot: bool = Field(default=False, description="Near schools, hospitals, or accident blackspots")
    complaint_count: int = Field(default=0, ge=0)
    segment_length_meters: float = Field(default=100.0, gt=0.0)

@app.get("/")
def get_root():
    return {
        "system": "RoadGuard Infrastructure Intelligence Platform",
        "institution": "Sri Vasavi Engineering College (Autonomous)",
        "department": "Artificial Intelligence & Machine Learning",
        "status": "Operational",
        "version": "1.0.0"
    }

@app.post("/api/v1/defects/assess")
def assess_defect(req: DefectAssessmentRequest):
    """
    Assesses defect severity, snaps GPS to road segment, routes to jurisdiction, and calculates priority.
    """
    # 1. Compute Severity
    severity_score, severity_level = calculate_defect_severity(
        defect_type=req.defect_type,
        normalized_area=req.normalized_area,
        aspect_ratio=req.aspect_ratio
    )

    # 2. Geospatial Snapping
    snap_result = road_network.snap_coordinate(req.latitude, req.longitude)

    # 3. Determine hierarchy and priority
    if snap_result and snap_result.get("matched"):
        hierarchy_str = snap_result["hierarchy"]
        try:
            hierarchy = RoadHierarchy(hierarchy_str)
        except ValueError:
            hierarchy = RoadHierarchy.URBAN_ARTERIAL
    else:
        hierarchy = RoadHierarchy.URBAN_ARTERIAL

    priority_result = calculate_maintenance_priority(
        peak_severity=severity_score,
        segment_density=severity_score,
        road_hierarchy=hierarchy,
        is_near_vulnerable_spot=False,
        complaint_count=req.complaint_count
    )

    return {
        "defect_analysis": {
            "type": req.defect_type.value,
            "severity_score": severity_score,
            "severity_level": severity_level
        },
        "geospatial_routing": snap_result,
        "maintenance_priority": priority_result
    }

@app.post("/api/v1/segments/prioritize")
def prioritize_segment(req: SegmentPrioritizationRequest):
    """
    Computes unified MPS for a segment given its aggregate defect profile.
    """
    if not req.defect_severities:
        raise HTTPException(status_code=400, detail="defect_severities list cannot be empty")

    peak_sev = max(req.defect_severities)
    seg_density = calculate_segment_density(req.defect_severities, req.segment_length_meters)

    priority_result = calculate_maintenance_priority(
        peak_severity=peak_sev,
        segment_density=seg_density,
        road_hierarchy=req.road_hierarchy,
        is_near_vulnerable_spot=req.is_near_vulnerable_spot,
        complaint_count=req.complaint_count
    )

    return {
        "segment_id": req.segment_id,
        "peak_severity": peak_sev,
        "segment_density": seg_density,
        "priority_result": priority_result
    }

@app.get("/api/v1/dashboard/overview")
def get_dashboard_overview():
    """
    Provides aggregated telemetry summary for the municipal dashboard.
    """
    return {
        "total_segments_monitored": len(road_network.segments),
        "active_jurisdictions": [
            "National Highways Authority of India (NHAI)",
            "Andhra Pradesh State PWD (Roads & Buildings)",
            "Tadepalligudem Municipal Corporation"
        ],
        "monitored_corridors": [
            {"id": s.segment_id, "name": s.road_name, "hierarchy": s.hierarchy, "jurisdiction": s.jurisdiction}
            for s in road_network.segments
        ]
    }
