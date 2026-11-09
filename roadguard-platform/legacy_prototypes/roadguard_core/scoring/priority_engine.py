"""
RoadGuard Scoring Engine: Mathematical Damage Severity and Maintenance Prioritization
Implements Section 5 of the RoadGuard Architecture:
- Defect Severity Index (S_i)
- Segment Distress Density (D_seg)
- Multi-Criteria Maintenance Priority Score (MPS)
"""

import math
from enum import Enum
from typing import Dict, List, Tuple, Any

class DefectType(str, Enum):
    POTHOLE = "pothole"
    ALLIGATOR_CRACK = "alligator_crack"
    TRANSVERSE_CRACK = "transverse_crack"
    LONGITUDINAL_CRACK = "longitudinal_crack"
    SURFACE_RAVELLING = "surface_ravelling"

class RoadHierarchy(str, Enum):
    NATIONAL_HIGHWAY = "NH"
    STATE_HIGHWAY = "SH"
    MAJOR_DISTRICT_ROAD = "MDR"
    URBAN_ARTERIAL = "URBAN"
    MUNICIPAL_WARD = "WARD"

# Structural Hazard Severity Weights (w_c)
DEFECT_WEIGHTS = {
    DefectType.POTHOLE: 3.0,
    DefectType.ALLIGATOR_CRACK: 2.5,
    DefectType.TRANSVERSE_CRACK: 1.8,
    DefectType.LONGITUDINAL_CRACK: 1.5,
    DefectType.SURFACE_RAVELLING: 1.2
}

# Road Hierarchy Operational Weights (W_road)
ROAD_HIERARCHY_WEIGHTS = {
    RoadHierarchy.NATIONAL_HIGHWAY: 1.0,
    RoadHierarchy.STATE_HIGHWAY: 0.85,
    RoadHierarchy.MAJOR_DISTRICT_ROAD: 0.70,
    RoadHierarchy.URBAN_ARTERIAL: 0.60,
    RoadHierarchy.MUNICIPAL_WARD: 0.45
}

def calculate_defect_severity(
    defect_type: DefectType,
    normalized_area: float,
    aspect_ratio: float = 1.0,
    alpha: float = 0.7,
    beta: float = 0.3
) -> Tuple[float, str]:
    """
    Computes individual Defect Severity Index (S_i).
    S_i = w_c * (alpha * sqrt(A_i) + beta * f(aspect_ratio))
    """
    w_c = DEFECT_WEIGHTS.get(defect_type, 1.5)
    area_factor = alpha * math.sqrt(max(0.0, min(1.0, normalized_area)))
    aspect_factor = beta * min(1.0, abs(aspect_ratio - 1.0) / 5.0)
    raw_score = (w_c / 3.0) * (area_factor + aspect_factor + 0.1)
    severity_score = round(min(1.0, max(0.05, raw_score)), 4)
    
    if severity_score >= 0.70:
        level = "High/Critical"
    elif severity_score >= 0.35:
        level = "Medium"
    else:
        level = "Low"
        
    return severity_score, level

def calculate_segment_density(
    defect_severities: List[float],
    segment_length_meters: float = 100.0
) -> float:
    """
    Computes segment distress concentration (D_seg).
    D_seg = (1 / L) * sum(S_i)
    """
    if not defect_severities or segment_length_meters <= 0:
        return 0.0
    density = sum(defect_severities) / (segment_length_meters / 10.0)
    return round(min(1.0, density), 4)

def calculate_maintenance_priority(
    peak_severity: float,
    segment_density: float,
    road_hierarchy: RoadHierarchy,
    is_near_vulnerable_spot: bool = False,
    complaint_count: int = 0,
    weights: Tuple[float, float, float, float, float] = (0.35, 0.25, 0.20, 0.10, 0.10)
) -> Dict[str, Any]:
    """
    Computes the Unified Multi-Criteria Maintenance Priority Score (MPS).
    MPS = w1*S_peak + w2*D_seg + w3*W_road + w4*R_loc + w5*C_freq
    """
    w1, w2, w3, w4, w5 = weights
    
    s_factor = min(1.0, max(0.0, peak_severity))
    d_factor = min(1.0, max(0.0, segment_density))
    r_factor = ROAD_HIERARCHY_WEIGHTS.get(road_hierarchy, 0.5)
    loc_factor = 1.0 if is_near_vulnerable_spot else 0.2
    c_factor = min(1.0, math.log(1.0 + max(0, complaint_count)) / math.log(11.0))
    
    mps = (
        (w1 * s_factor) +
        (w2 * d_factor) +
        (w3 * r_factor) +
        (w4 * loc_factor) +
        (w5 * c_factor)
    )
    final_score = round(min(100.0, mps * 100.0), 2)
    
    if final_score >= 70.0:
        tier = "CRITICAL_DISPATCH"
        recommended_action = "Emergency road patch / immediate repair crew dispatch within 24-48 hours"
    elif final_score >= 45.0:
        tier = "SCHEDULED_REPAIR"
        recommended_action = "Include in weekly municipal maintenance cycle"
    else:
        tier = "ROUTINE_MONITORING"
        recommended_action = "Log for periodic condition reassessment during next survey"
        
    return {
        "priority_score": final_score,
        "priority_tier": tier,
        "recommended_action": recommended_action,
        "components": {
            "peak_severity": round(s_factor, 4),
            "segment_density": round(d_factor, 4),
            "road_hierarchy_weight": round(r_factor, 4),
            "location_risk_weight": round(loc_factor, 4),
            "complaint_recurrence_weight": round(c_factor, 4)
        }
    }
