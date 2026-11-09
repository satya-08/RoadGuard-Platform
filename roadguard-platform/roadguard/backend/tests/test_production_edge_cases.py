import pytest
import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from roadguard.backend.app.main import app
from roadguard.backend.app.core.database import Base, get_db
from roadguard.backend.app.core.security import verify_password, get_password_hash, create_access_token
from roadguard.backend.app.models.entities import User, Complaint, MaintenanceTask, AuditLog, RoadSegment
from roadguard.backend.app.models.enums import UserRole, IssueStatusEnum
from roadguard.backend.app.core.mongodb import get_mongodb_status, log_mongo_audit

TEST_DB_URL = "sqlite:///./test_edge_cases.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="module", autouse=True)
def setup_test_database():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    
    # Create test accounts
    users = [
        User(
            id="user-citizen-001",
            email="test_citizen@roadguard.org",
            hashed_password=get_password_hash("password123"),
            full_name="Test Citizen",
            role=UserRole.CITIZEN.value,
            department="Ward 1"
        ),
        User(
            id="user-nhai-001",
            email="test_nhai@roadguard.org",
            hashed_password=get_password_hash("password123"),
            full_name="Test NHAI Director",
            role=UserRole.NHAI_AUTHORITY.value,
            department="NHAI PIU"
        ),
        User(
            id="user-contractor-001",
            email="test_contractor@roadguard.org",
            hashed_password=get_password_hash("password123"),
            full_name="Test Contractor",
            role=UserRole.MAINTENANCE_CONTRACTOR.value,
            department="Asphalt Corp"
        ),
        User(
            id="user-admin-001",
            email="test_admin@roadguard.org",
            hashed_password=get_password_hash("password123"),
            full_name="Test Admin",
            role=UserRole.ADMIN.value,
            department="Central"
        )
    ]
    for u in users:
        if not db.query(User).filter(User.email == u.email).first():
            db.add(u)

    # Seed road segment
    seg = RoadSegment(
        id="seg-nh16-001",
        segment_code="NH16-TDD-001",
        road_name="NH-16 Tadepalligudem Bypass",
        road_hierarchy="NH",
        jurisdiction="National Highways Authority of India (NHAI)",
        responsible_authority="National Highways Authority of India (NHAI)",
        start_lat=16.8200,
        start_lon=81.5150,
        end_lat=16.8350,
        end_lon=81.5300
    )
    if not db.query(RoadSegment).filter(RoadSegment.id == seg.id).first():
        db.add(seg)

    db.commit()
    db.close()
    yield
    app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(bind=test_engine)
    import os
    if os.path.exists("./test_edge_cases.db"):
        try:
            os.remove("./test_edge_cases.db")
        except Exception:
            pass

client = TestClient(app)

def get_auth_token(email: str) -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": "password123"})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]


# ==============================================================================
# EDGE CASE CATEGORY 1: AUTHENTICATION
# ==============================================================================
def test_edge_case_1_auth_credentials():
    # Valid login
    res = client.post("/api/v1/auth/login", json={"email": "test_citizen@roadguard.org", "password": "password123"})
    assert res.status_code == 200
    assert "access_token" in res.json()

    # Invalid password
    bad_res = client.post("/api/v1/auth/login", json={"email": "test_citizen@roadguard.org", "password": "wrong_password"})
    assert bad_res.status_code == 401

    # Non-existent user
    non_res = client.post("/api/v1/auth/login", json={"email": "nonexistent@roadguard.org", "password": "password123"})
    assert non_res.status_code == 401


# ==============================================================================
# EDGE CASE CATEGORY 2: AUTHORIZATION (RBAC)
# ==============================================================================
def test_edge_case_2_role_based_access_control():
    citizen_token = get_auth_token("test_citizen@roadguard.org")
    admin_token = get_auth_token("test_admin@roadguard.org")

    # Citizen trying to list all users (admin only) -> 403 Forbidden
    res = client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {citizen_token}"})
    assert res.status_code == 403

    # Admin accessing users list -> 200 OK
    res_admin = client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_admin.status_code == 200


# ==============================================================================
# EDGE CASE CATEGORY 3: INPUT VALIDATION
# ==============================================================================
def test_edge_case_3_input_validation():
    citizen_token = get_auth_token("test_citizen@roadguard.org")

    # Invalid latitude > 90
    invalid_payload = {
        "latitude": 95.0,
        "longitude": 81.5210,
        "image_url": "/uploads/test.jpg"
    }
    res = client.post(
        "/api/v1/complaints/submit",
        json=invalid_payload,
        headers={"Authorization": f"Bearer {citizen_token}"}
    )
    assert res.status_code == 422 # Pydantic Validation Error

    # Missing image_url
    missing_img = {
        "latitude": 16.8260,
        "longitude": 81.5210
    }
    res_img = client.post(
        "/api/v1/complaints/submit",
        json=missing_img,
        headers={"Authorization": f"Bearer {citizen_token}"}
    )
    assert res_img.status_code == 422


# ==============================================================================
# EDGE CASE CATEGORY 4: DATABASE INTEGRITY & DEDUPLICATION
# ==============================================================================
def test_edge_case_4_database_integrity_and_deduplication():
    citizen_token = get_auth_token("test_citizen@roadguard.org")
    base_payload = {
        "latitude": 16.8260,
        "longitude": 81.5210,
        "address": "NH-16 Bypass Test Milepost 10",
        "image_url": "/uploads/raw/test1.jpg",
        "description": "Severe pothole cluster",
        "peak_severity": 0.8,
        "severity_level": "High"
    }

    # Submit first complaint
    r1 = client.post("/api/v1/complaints/submit", json=base_payload, headers={"Authorization": f"Bearer {citizen_token}"})
    assert r1.status_code == 201
    d1 = r1.json()
    assert d1["is_duplicate"] is False

    # Submit second complaint within 35 meters -> must be flagged as duplicate
    dup_payload = {**base_payload, "image_url": "/uploads/raw/test2.jpg", "description": "Duplicate report nearby"}
    r2 = client.post("/api/v1/complaints/submit", json=dup_payload, headers={"Authorization": f"Bearer {citizen_token}"})
    assert r2.status_code == 201
    d2 = r2.json()
    assert d2["is_duplicate"] is True
    assert d2["status"] == "Duplicate"


# ==============================================================================
# EDGE CASE CATEGORY 5: HTTP STATUS BEHAVIOR
# ==============================================================================
def test_edge_case_5_http_status_codes():
    # 404 for non-existent reference
    res = client.get("/api/v1/complaints/track/RG-NONEXISTENT-999")
    assert res.status_code == 404

    # 401 for protected endpoint with invalid token
    res_bad_tok = client.get("/api/v1/complaints/my-complaints", headers={"Authorization": "Bearer invalid.jwt.token"})
    assert res_bad_tok.status_code == 401


# ==============================================================================
# EDGE CASE CATEGORY 6: DISPATCH WORKFLOW & DOUBLE-DISPATCH PREVENTION
# ==============================================================================
def test_edge_case_6_dispatch_workflow():
    nhai_token = get_auth_token("test_nhai@roadguard.org")
    citizen_token = get_auth_token("test_citizen@roadguard.org")

    # Lodge fresh complaint
    comp_res = client.post(
        "/api/v1/complaints/submit",
        json={
            "latitude": 16.8290,
            "longitude": 81.5250,
            "address": "NH-16 Toll Gate Approach",
            "image_url": "/uploads/raw/toll.jpg",
            "peak_severity": 0.7,
            "severity_level": "High"
        },
        headers={"Authorization": f"Bearer {citizen_token}"}
    )
    assert comp_res.status_code == 201
    comp_id = comp_res.json()["id"]

    # Citizen attempting to dispatch -> 403 Forbidden
    c_dispatch = client.post(
        "/api/v1/maintenance/tasks",
        json={
            "complaint_id": comp_id,
            "assigned_authority": "Contractor A",
            "work_instructions": "Repair immediately"
        },
        headers={"Authorization": f"Bearer {citizen_token}"}
    )
    assert c_dispatch.status_code == 403

    # NHAI Officer dispatches -> 201 Created
    nhai_dispatch = client.post(
        "/api/v1/maintenance/tasks",
        json={
            "complaint_id": comp_id,
            "assigned_authority": "Sri Sai Pavement Works",
            "priority_level": "CRITICAL_DISPATCH",
            "work_instructions": "Cold milling and 50mm bitumen overlay"
        },
        headers={"Authorization": f"Bearer {nhai_token}"}
    )
    assert nhai_dispatch.status_code == 201
    task = nhai_dispatch.json()
    assert task["task_code"].startswith("WO-")

    # Double dispatch prevention: dispatching same complaint again -> 400 Bad Request
    re_dispatch = client.post(
        "/api/v1/maintenance/tasks",
        json={
            "complaint_id": comp_id,
            "assigned_authority": "Another Contractor",
            "work_instructions": "Duplicate attempt"
        },
        headers={"Authorization": f"Bearer {nhai_token}"}
    )
    assert re_dispatch.status_code == 400


# ==============================================================================
# EDGE CASE CATEGORY 7: GPS BOUNDS & CORRIDOR SNAPPING
# ==============================================================================
def test_edge_case_7_gps_routing_and_out_of_bounds():
    # Coords close to NH-16 (within 200m)
    snap_nhai = client.post("/api/v1/gis/snap", json={"latitude": 16.8260, "longitude": 81.5210})
    assert snap_nhai.status_code == 200
    assert "NHAI" in snap_nhai.json()["jurisdiction"]

    # Coords far away (> 50 km in Bay of Bengal) -> routes to manual review queue
    snap_far = client.post("/api/v1/gis/snap", json={"latitude": 15.0000, "longitude": 82.5000})
    assert snap_far.status_code == 200
    assert snap_far.json()["requires_manual_routing"] is True


# ==============================================================================
# EDGE CASE CATEGORY 8: LOCATION PERSISTENCE
# ==============================================================================
def test_edge_case_8_location_persistence():
    citizen_token = get_auth_token("test_citizen@roadguard.org")
    custom_addr = "Beside Vasavi College Main Gate, Pedatadepalli"

    sub_res = client.post(
        "/api/v1/complaints/submit",
        json={
            "latitude": 16.8420,
            "longitude": 81.5050,
            "address": custom_addr,
            "image_url": "/uploads/raw/svec.jpg",
            "peak_severity": 0.5
        },
        headers={"Authorization": f"Bearer {citizen_token}"}
    )
    assert sub_res.status_code == 201
    ref = sub_res.json()["reference_no"]

    # Retrieve via public track endpoint -> verify address is preserved
    track_res = client.get(f"/api/v1/complaints/track/{ref}")
    assert track_res.status_code == 200
    assert track_res.json()["address"] == custom_addr


# ==============================================================================
# EDGE CASE CATEGORY 9: COMPLAINT LIFECYCLE STATE MACHINE
# ==============================================================================
def test_edge_case_9_complaint_lifecycle():
    nhai_token = get_auth_token("test_nhai@roadguard.org")
    citizen_token = get_auth_token("test_citizen@roadguard.org")

    # Step A: Submitted
    c_res = client.post(
        "/api/v1/complaints/submit",
        json={"latitude": 16.8300, "longitude": 81.5220, "image_url": "/uploads/test.jpg"},
        headers={"Authorization": f"Bearer {citizen_token}"}
    )
    cid = c_res.json()["id"]
    assert c_res.json()["status"] == "Submitted"

    # Step B: Assigned
    t_res = client.post(
        "/api/v1/maintenance/tasks",
        json={"complaint_id": cid, "assigned_authority": "Sri Sai Pavement Works"},
        headers={"Authorization": f"Bearer {nhai_token}"}
    )
    assert t_res.status_code == 201
    tid = t_res.json()["id"]

    # Step C: In Progress
    up_res = client.patch(
        f"/api/v1/maintenance/tasks/{tid}",
        json={"status": "In Progress", "contractor_notes": "Crew mobilized on site with asphalt roller."},
        headers={"Authorization": f"Bearer {nhai_token}"}
    )
    assert up_res.status_code == 200
    assert up_res.json()["status"] == "In Progress"

    # Step D: Repair Completed
    comp_res = client.patch(
        f"/api/v1/maintenance/tasks/{tid}",
        json={"status": "Repair Completed", "contractor_notes": "Patching executed."},
        headers={"Authorization": f"Bearer {nhai_token}"}
    )
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "Repair Completed"


# ==============================================================================
# EDGE CASE CATEGORY 10: UI/UX COMPATIBILITY (AI Response Fields)
# ==============================================================================
def test_edge_case_10_ai_response_fields():
    # Test reverse geocoding fallback
    rev_res = client.get("/api/v1/gis/reverse-geocode?latitude=16.8260&longitude=81.5210")
    assert rev_res.status_code == 200
    data = rev_res.json()
    assert "display_name" in data
    assert "source" in data


# ==============================================================================
# EDGE CASE CATEGORY 11: SECURITY & PASSWORD HASHING
# ==============================================================================
def test_edge_case_11_cryptographic_password_hashing():
    raw_pwd = "MySecretSecurePassword2026!"
    hashed = get_password_hash(raw_pwd)
    
    # Must start with standard BCrypt prefix ($2b$)
    assert hashed.startswith("$2b$") or hashed.startswith("$2a$")
    assert hashed != raw_pwd
    assert verify_password(raw_pwd, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


# ==============================================================================
# EDGE CASE CATEGORY 12: DEPLOYMENT & MONGODB FALLBACK
# ==============================================================================
def test_edge_case_12_mongodb_fallback_resilience():
    status = get_mongodb_status()
    assert "enabled" in status
    assert "connected" in status
    assert "status" in status
    
    # Testing non-blocking audit logging when MongoDB is in fallback mode
    success = log_mongo_audit(
        action="TEST_EDGE_CASE_12",
        entity_type="Diagnostic",
        entity_id=str(uuid.uuid4()),
        details="Verifying failsafe execution"
    )
    # Does not crash even if MongoDB is not connected
    assert isinstance(success, bool)
