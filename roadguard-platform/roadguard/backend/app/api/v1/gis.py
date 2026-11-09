import json
import urllib.request
import urllib.error
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from roadguard.backend.app.core.database import get_db
from roadguard.backend.app.models.entities import RoadSegment, Complaint
from roadguard.backend.app.schemas.gis import CoordinateInput, SnapResultResponse, RoadSegmentResponse
from roadguard.backend.app.gis.engine import gis_engine

router = APIRouter(prefix="/gis", tags=["GIS & Road Authority Routing"])

@router.post("/snap", response_model=SnapResultResponse)
def snap_coordinates(coords: CoordinateInput):
    """
    Snaps GPS coordinates to surveyed road network and identifies the responsible authority.
    If outside configured tolerance, routes to manual review queue.
    """
    res = gis_engine.snap_coordinate(coords.latitude, coords.longitude, tolerance_meters=coords.tolerance_meters or 350.0)
    return res

@router.get("/reverse-geocode")
def reverse_geocode_location(
    latitude: float = Query(..., ge=-90.0, le=90.0),
    longitude: float = Query(..., ge=-180.0, le=180.0)
):
    """
    Resolves human-readable street/corridor name from GPS coordinates.
    Attempts OpenStreetMap Nominatim reverse geocoding with strict User-Agent policy,
    and falls back cleanly to local RoadGuard GIS spatial network snapping if offline.
    """
    snap_fallback = gis_engine.snap_coordinate(latitude, longitude)
    fallback_name = snap_fallback.get("road_name") or f"Location ({latitude:.4f}, {longitude:.4f})"
    
    url = f"https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat={latitude}&lon={longitude}&zoom=18&addressdetails=1"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "RoadGuard/1.0 (contact@roadguard.org)"}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=3.0) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                addr = data.get("address", {})
                road = addr.get("road") or addr.get("pedestrian") or addr.get("highway") or snap_fallback.get("road_name")
                city = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("county", "")
                state = addr.get("state", "")
                
                parts = [p for p in [road, city, state] if p]
                formatted_name = ", ".join(parts) if parts else data.get("display_name", fallback_name)

                return {
                    "display_name": formatted_name,
                    "road": road or snap_fallback.get("road_name"),
                    "city": city,
                    "state": state,
                    "full_address": data.get("display_name", formatted_name),
                    "source": "openstreetmap_nominatim",
                    "snap": snap_fallback
                }
    except Exception:
        pass

    # Clean local fallback
    return {
        "display_name": fallback_name,
        "road": snap_fallback.get("road_name"),
        "city": "West Godavari",
        "state": "Andhra Pradesh",
        "full_address": fallback_name,
        "source": "roadguard_spatial_snap",
        "snap": snap_fallback
    }

@router.get("/segments", response_model=List[RoadSegmentResponse])
def get_all_road_segments(db: Session = Depends(get_db)):
    """
    Retrieves all road segments with their current health score, PCI, and condition status.
    """
    return db.query(RoadSegment).all()

@router.get("/segments/{segment_id}", response_model=RoadSegmentResponse)
def get_road_segment(segment_id: str, db: Session = Depends(get_db)):
    seg = db.query(RoadSegment).filter(RoadSegment.id == segment_id).first()
    if not seg:
        raise HTTPException(status_code=404, detail="Road segment not found")
    return seg

@router.get("/map-layers")
def get_map_layers(db: Session = Depends(get_db)):
    """
    Returns geographical corridors with polylines and active defect points for Leaflet map visualization.
    """
    segments = db.query(RoadSegment).all()
    active_complaints = db.query(Complaint).filter(Complaint.status != "Closed").all()

    corridors = []
    for s in segments:
        corridors.append({
            "id": s.id,
            "segment_code": s.segment_code,
            "road_name": s.road_name,
            "hierarchy": s.road_hierarchy,
            "jurisdiction": s.jurisdiction,
            "responsible_authority": s.responsible_authority,
            "health_score": s.health_score,
            "condition_status": s.condition_status,
            "start": [s.start_lat, s.start_lon],
            "end": [s.end_lat, s.end_lon],
            "total_defects": s.total_defects
        })

    defects = []
    for c in active_complaints:
        defects.append({
            "id": c.id,
            "reference_no": c.reference_no,
            "lat": c.latitude,
            "lon": c.longitude,
            "severity_level": c.severity_level,
            "peak_severity": c.peak_severity,
            "priority_tier": c.priority_tier,
            "priority_score": c.priority_score,
            "status": c.status,
            "road_name": c.road_name,
            "responsible_authority": c.responsible_authority,
            "image_url": c.image_url,
            "annotated_image_url": c.annotated_image_url
        })

    return {
        "center": [16.8300, 81.5200],
        "default_zoom": 13,
        "corridors": corridors,
        "defects": defects
    }
