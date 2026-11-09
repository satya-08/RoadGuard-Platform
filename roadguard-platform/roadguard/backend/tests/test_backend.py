import pytest
import os
import sys
from pathlib import Path
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from roadguard.backend.app.main import app
from roadguard.backend.app.core.database import Base, get_db
from roadguard.backend.app.core.security import verify_password, get_password_hash, create_access_token
from roadguard.backend.app.gis.engine import gis_engine, haversine_distance_meters
from roadguard.backend.app.priority.engine import (
    calculate_defect_severity,
    calculate_pci_score,
    predict_degradation_forecast,
    calculate_maintenance_priority
)
from roadguard.backend.app.ai.pipeline import run_ai_inference

# In-memory test database
TEST_SQLALCHEMY_DATABASE_URL = "sqlite:///./test_roadguard.db"
test_engine = create_engine(TEST_SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=test_engine)
    client = TestClient(app)
    # Seed demo users & segments
    client.post("/api/v1/auth/seed-demo-users")
    yield
    app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(bind=test_engine)
    if os.path.exists("./test_roadguard.db"):
        try:
            os.remove("./test_roadguard.db")
        except Exception:
            pass

client = TestClient(app)

# 1. Security & Password Tests
def test_password_hashing():
    pwd = "secretpassword123"
    hashed = get_password_hash(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("wrongpassword", hashed) is False

# 2. Authentication API Tests
def test_user_registration_and_login():
    reg_payload = {
        "email": "test_citizen@roadguard.org",
        "password": "mypassword123",
        "full_name": "Test Citizen User",
        "phone": "+91 99999 88888",
        "role": "citizen"
    }
    res = client.post("/api/v1/auth/register", json=reg_payload)
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "test_citizen@roadguard.org"

    # Login
    login_res = client.post("/api/v1/auth/login", json={
        "email": "test_citizen@roadguard.org",
        "password": "mypassword123"
    })
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data
    assert token_data["role"] == "citizen"

# 3. GIS Snapping & Jurisdiction Routing Tests
def test_gis_nhai_corridor_snapping():
    # Near NH-16 Tadepalligudem Bypass
    lat, lon = 16.8260, 81.5210
    snap = gis_engine.snap_coordinate(lat, lon)
    assert snap["matched"] is True
    assert "NH-16" in snap["road_name"]
    assert "NHAI" in snap["jurisdiction"]
    assert snap["requires_manual_routing"] is False

def test_gis_state_highway_snapping():
    # Near Pedatadepalli - SVEC Road
    lat, lon = 16.8420, 81.5050
    snap = gis_engine.snap_coordinate(lat, lon)
    assert snap["matched"] is True
    assert "SVEC" in snap["road_name"]
    assert "PWD" in snap["jurisdiction"]

def test_gis_unknown_location_routing():
    # Remote coordinates far outside coverage buffer
    lat, lon = 28.6139, 77.2090 # New Delhi
    snap = gis_engine.snap_coordinate(lat, lon, tolerance_meters=350.0)
    assert snap["matched"] is False
    assert snap["requires_manual_routing"] is True
    assert "manual review" in snap["message"].lower()

# 4. Severity & Pavement Condition Index (PCI) Tests
def test_severity_calculation():
    score_pothole, level = calculate_defect_severity("pothole", normalized_area=0.08, aspect_ratio=1.2)
    assert score_pothole >= 0.30
    assert level in ["High", "Critical", "Medium"]

    # Low area crack
    score_crack, level_crack = calculate_defect_severity("crack", normalized_area=0.005, aspect_ratio=3.0)
    assert score_crack < score_pothole

def test_astm_pci_calculation():
    # Zero severity = 100 PCI
    assert calculate_pci_score(0.0) == 100.0
    # High severity = Low PCI
    pci_high = calculate_pci_score(0.8)
    assert pci_high < 20.0
    # Complete failure
    assert calculate_pci_score(1.0) == 0.0

# 5. Maintenance Priority Score (MPS) Tests
def test_maintenance_priority_engine():
    res = calculate_maintenance_priority(
        peak_severity=0.85,
        segment_density=0.75,
        road_hierarchy="NH",
        is_near_vulnerable_spot=True,
        complaint_count=5
    )
    assert res["priority_score"] >= 70.0
    assert res["priority_tier"] == "CRITICAL_DISPATCH"
    assert "immediate repair" in res["recommended_action"].lower()

def test_routine_monitoring_priority():
    res = calculate_maintenance_priority(
        peak_severity=0.15,
        segment_density=0.10,
        road_hierarchy="WARD",
        is_near_vulnerable_spot=False,
        complaint_count=0
    )
    assert res["priority_score"] < 45.0
    assert res["priority_tier"] == "ROUTINE_MONITORING"

# 6. AI Inference Integration Test
def test_ai_inference_pipeline():
    sample_img = ROOT_DIR / "roadguard" / "sample_data" / "sample_pothole_critical.jpg"
    if sample_img.exists():
        result = run_ai_inference(str(sample_img), confidence_thresh=0.20)
        assert result["success"] is True
        assert "pci_score" in result
        assert "annotated_image_url" in result
        assert "xai_heatmap_url" in result

# 7. Mock Government Integration Test
def test_mock_government_integration():
    # Login as admin to get token
    login_res = client.post("/api/v1/auth/login", json={
        "email": "admin@roadguard.org",
        "password": "roadguard2026"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "internal_complaint_id": "test-uuid-1234",
        "target_portal": "CPGRAMS",
        "road_name": "NH-16 Tadepalligudem Bypass",
        "defect_description": "Severe pothole cluster",
        "latitude": 16.8260,
        "longitude": 81.5210
    }
    res = client.post("/api/v1/integrations/mock-authority-submit", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["is_demonstration"] is True
    assert "MOCK-GOV-CPGRAMS" in data["mock_reference_number"]
    assert "ATTENTION: This is a simulated mock integration" in data["demonstration_disclaimer"]
