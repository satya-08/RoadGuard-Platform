from enum import Enum

class UserRole(str, Enum):
    CITIZEN = "citizen"
    FIELD_INSPECTOR = "field_inspector"
    LOCAL_AUTHORITY = "local_authority"
    MUNICIPAL_AUTHORITY = "municipal_authority"
    STATE_HIGHWAY_AUTHORITY = "state_highway_authority"
    NHAI_AUTHORITY = "nhai_authority"
    MAINTENANCE_CONTRACTOR = "maintenance_contractor"
    ADMIN = "admin"

class RoadHierarchyEnum(str, Enum):
    NATIONAL_HIGHWAY = "NH"
    STATE_HIGHWAY = "SH"
    MAJOR_DISTRICT_ROAD = "MDR"
    URBAN_ARTERIAL = "URBAN"
    MUNICIPAL_WARD = "WARD"
    RURAL_ROAD = "RURAL"
    UNKNOWN = "UNKNOWN"

class DefectTypeEnum(str, Enum):
    POTHOLE = "pothole"
    CRACK = "crack"
    LONGITUDINAL_CRACK = "longitudinal_crack"
    TRANSVERSE_CRACK = "transverse_crack"
    ALLIGATOR_CRACK = "alligator_crack"
    OPEN_MANHOLE = "open_manhole"
    SURFACE_RAVELLING = "surface_ravelling"
    OTHER = "other"

class SeverityLevelEnum(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"

class PriorityTierEnum(str, Enum):
    CRITICAL_DISPATCH = "CRITICAL_DISPATCH"
    SCHEDULED_REPAIR = "SCHEDULED_REPAIR"
    ROUTINE_MONITORING = "ROUTINE_MONITORING"

class IssueStatusEnum(str, Enum):
    SUBMITTED = "Submitted"
    AI_ANALYZED = "AI Analyzed"
    PENDING_REVIEW = "Pending Review"
    ASSIGNED = "Assigned"
    INSPECTION_SCHEDULED = "Inspection Scheduled"
    IN_PROGRESS = "In Progress"
    REPAIR_COMPLETED = "Repair Completed"
    VERIFICATION_PENDING = "Verification Pending"
    CLOSED = "Closed"
    REJECTED = "Rejected"
    DUPLICATE = "Duplicate"
    NEEDS_MORE_INFO = "Needs More Information"
    REOPENED = "Reopened"
    ESCALATED = "Escalated"

class VerificationStatusEnum(str, Enum):
    PASSED = "Verification Passed"
    FAILED = "Verification Failed"
    INCONCLUSIVE = "Inconclusive - Manual Inspection Required"
    PENDING = "Verification Pending"
