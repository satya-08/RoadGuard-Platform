from typing import Dict, List, Any
from pydantic import BaseModel

class StatusBreakdown(BaseModel):
    status: str
    count: int

class SeverityBreakdown(BaseModel):
    level: str
    count: int

class PriorityTierBreakdown(BaseModel):
    tier: str
    count: int

class AuthorityWorkload(BaseModel):
    authority: str
    total_assigned: int
    pending: int
    in_progress: int
    completed: int

class DashboardStatsResponse(BaseModel):
    total_complaints: int
    unreviewed_complaints: int
    critical_dispatches: int
    in_progress_tasks: int
    verified_repairs: int
    avg_pci_network: float
    status_distribution: List[StatusBreakdown]
    severity_distribution: List[SeverityBreakdown]
    priority_distribution: List[PriorityTierBreakdown]
    authority_workloads: List[AuthorityWorkload]
    monitored_segments: int
