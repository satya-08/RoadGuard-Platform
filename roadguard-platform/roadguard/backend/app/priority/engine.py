import math
from typing import Dict, List, Tuple, Any, Optional
from roadguard.backend.app.models.enums import (
    DefectTypeEnum, RoadHierarchyEnum, SeverityLevelEnum, PriorityTierEnum
)

# Structural Hazard Severity Base Weights (w_c)
DEFECT_WEIGHTS = {
    DefectTypeEnum.POTHOLE.value: 3.0,
    DefectTypeEnum.OPEN_MANHOLE.value: 3.2,
    DefectTypeEnum.ALLIGATOR_CRACK.value: 2.5,
    DefectTypeEnum.TRANSVERSE_CRACK.value: 1.8,
    DefectTypeEnum.LONGITUDINAL_CRACK.value: 1.5,
    DefectTypeEnum.CRACK.value: 2.0,
    DefectTypeEnum.SURFACE_RAVELLING.value: 1.2,
    DefectTypeEnum.OTHER.value: 1.0
}

# Road Hierarchy Operational Weights (W_road)
ROAD_HIERARCHY_WEIGHTS = {
    RoadHierarchyEnum.NATIONAL_HIGHWAY.value: 1.0,
    RoadHierarchyEnum.STATE_HIGHWAY.value: 0.85,
    RoadHierarchyEnum.MAJOR_DISTRICT_ROAD.value: 0.70,
    RoadHierarchyEnum.URBAN_ARTERIAL.value: 0.60,
    RoadHierarchyEnum.MUNICIPAL_WARD.value: 0.45,
    RoadHierarchyEnum.RURAL_ROAD.value: 0.35,
    RoadHierarchyEnum.UNKNOWN.value: 0.40
}

def calculate_defect_severity(
    defect_type: str,
    normalized_area: float,
    aspect_ratio: float = 1.0,
    confidence: float = 0.8,
    alpha: float = 0.7,
    beta: float = 0.3
) -> Tuple[float, str]:
    """
    Computes individual Defect Severity Index (S_i) using 6-factor AHP principles.
    S_i = (w_c / 3.0) * (alpha * sqrt(A_i) + beta * f(aspect_ratio) + 0.1 * confidence)
    """
    w_c = DEFECT_WEIGHTS.get(defect_type.lower(), 1.5)
    area_factor = alpha * math.sqrt(max(0.0, min(1.0, normalized_area)))
    aspect_factor = beta * min(1.0, abs(aspect_ratio - 1.0) / 4.0)
    conf_factor = 0.1 * min(1.0, max(0.2, confidence))
    
    raw_score = (w_c / 3.0) * (area_factor + aspect_factor + conf_factor + 0.05)
    severity_score = round(min(1.0, max(0.05, raw_score)), 4)
    
    if severity_score >= 0.70:
        level = SeverityLevelEnum.CRITICAL.value
    elif severity_score >= 0.50:
        level = SeverityLevelEnum.HIGH.value
    elif severity_score >= 0.28:
        level = SeverityLevelEnum.MEDIUM.value
    else:
        level = SeverityLevelEnum.LOW.value
        
    return severity_score, level

def calculate_pci_score(peak_severity: float) -> float:
    """
    Computes ASTM D6433 Pavement Condition Index (PCI) adapted for automated visual distress.
    PCI = 100 * (1 - severity)^1.7
    """
    s = min(1.0, max(0.0, peak_severity))
    pci = 100.0 * math.pow(max(0.0, 1.0 - s), 1.7)
    return round(pci, 1)

def predict_degradation_forecast(severity_score: float) -> Dict[str, Any]:
    """
    HDM-4 World Bank Deterioration Dynamics + 4-State Markov Model.
    Predicts condition deterioration at 30, 60, and 90 days.
    """
    s0 = min(0.99, max(0.05, severity_score))
    
    # Calibrated progression rate k based on initial severity
    if s0 < 0.35:
        k = 0.008
    elif s0 < 0.65:
        k = 0.015
    else:
        k = 0.025
        
    def sigmoid_deg(t_days: int) -> float:
        # s(t) = 1 / (1 + ((1-s0)/s0) * exp(-k * t))
        val = 1.0 / (1.0 + ((1.0 - s0) / s0) * math.exp(-k * t_days))
        return round(min(1.0, val), 3)

    day30 = sigmoid_deg(30)
    day60 = sigmoid_deg(60)
    day90 = sigmoid_deg(90)
    
    return {
        "current_severity": s0,
        "forecast_30_days": day30,
        "forecast_60_days": day60,
        "forecast_90_days": day90,
        "pci_current": calculate_pci_score(s0),
        "pci_30_days": calculate_pci_score(day30),
        "pci_60_days": calculate_pci_score(day60),
        "pci_90_days": calculate_pci_score(day90),
    }

def calculate_segment_density(
    defect_severities: List[float],
    segment_length_meters: float = 100.0
) -> float:
    """
    Computes segment distress concentration (D_seg).
    D_seg = sum(S_i) / (L / 10.0)
    """
    if not defect_severities or segment_length_meters <= 0:
        return 0.0
    density = sum(defect_severities) / (segment_length_meters / 10.0)
    return round(min(1.0, density), 4)

def calculate_maintenance_priority(
    peak_severity: float,
    segment_density: float,
    road_hierarchy: str,
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
        tier = PriorityTierEnum.CRITICAL_DISPATCH.value
        recommended_action = "Emergency road patch / immediate repair crew dispatch within 24-48 hours."
    elif final_score >= 45.0:
        tier = PriorityTierEnum.SCHEDULED_REPAIR.value
        recommended_action = "Include in weekly scheduled municipal maintenance cycle."
    else:
        tier = PriorityTierEnum.ROUTINE_MONITORING.value
        recommended_action = "Log for periodic condition reassessment during next survey."
        
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
