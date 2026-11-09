# RoadGuard: System Audit, Bug Remediation & Production-Readiness Report

**Department of Artificial Intelligence & Machine Learning**  
**Sri Vasavi Engineering College (Autonomous)**  
**Major Project Identity:** RoadGuard &mdash; Explainable Deep Learning Road Damage Assessment & Intelligent Maintenance Prioritization System  

---

## 1. Executive Summary & Audit Overview

During this comprehensive audit and stabilization cycle, the entire RoadGuard codebase (FastAPI backend, React 18 TypeScript frontend, YOLOv8 computer vision inference engine, and dual relational/document storage) was audited, debugged, and elevated to full production readiness.

### Key Remediation Highlights
1. **HTTP 500 on Complaint Submission Fixed:**
   - **Root Cause A:** Anonymous citizen submissions were failing with unhandled 401/500 errors because the endpoint strictly required authenticated user tokens (`Depends(get_current_user)`).
   - **Root Cause B:** Duplicate query datetime calculations used timezone-aware `datetime.now(timezone.utc)` compared against naive SQLite datetimes, causing SQLite runtime comparison crashes.
   - **Root Cause C:** Missing `raw_image_url` in Pydantic's `AIAnalysisResponse` schema caused the frontend to receive `undefined` for uploaded image URLs.
   - **Fix:** Introduced non-throwing `get_current_user_optional`, standardized all DB timestamps to naive UTC (`.replace(tzinfo=None)`), ensured explicit UUID generation, and added robust detection parsing.

2. **Dispatch Button Crash Fixed:**
   - **Root Cause:** In `POST /api/v1/maintenance/tasks`, `MaintenanceTask` was added to the SQLAlchemy session without an immediate `db.flush()`. When `AuditLog` was constructed referencing `entity_id=task.id`, `task.id` was `None`, violating the SQLite NOT NULL constraint on `audit_logs.entity_id` and raising `sqlite3.IntegrityError`.
   - **Fix:** Explicitly assigned UUIDs upon task creation, executed `db.flush()` prior to creating the audit record, made `AuditLog.entity_id` nullable as an extra failsafe, and added state validation preventing duplicate work order dispatch.

3. **Critical Authorization Hole Remedied:**
   - **Vulnerability:** In `deps.py`, `require_roles` contained the expression `if current_user.role == UserRole.ADMIN.value or "admin" in allowed_roles:`. Since `"admin"` is present in the `allowed_roles` list of any administrative endpoint, Python evaluated `"admin" in allowed_roles` to `True` for **all authenticated users**, completely bypassing role checks.
   - **Fix:** Corrected to `if current_user.role == UserRole.ADMIN.value or current_user.role in allowed_roles:`.
   - **Insecure Role Switcher Removed:** Replaced the client-side dropdown switcher with a cryptographic BCrypt authentication flow, dedicated `ProtectedRoute` components, and role-specific portal routing.

4. **GPS Reverse Geocoding & Location Persistence:**
   - Added `GET /api/v1/gis/reverse-geocode` leveraging OpenStreetMap Nominatim with an academic User-Agent header, timeout handling, and automatic fallback to RoadGuard spatial snapping.
   - Preserves manual citizen street/corridor edits and persists them across the entire complaint and maintenance lifecycle.

5. **MongoDB Dual-Database Integration:**
   - Added `core/mongodb.py` supporting MongoDB Atlas Free Tier (M0) and local MongoDB.
   - Dual-writes audit trail documents, GeoJSON complaint records, and AI perception trees without breaking relational database integrity. Includes resilient non-blocking fallback if MongoDB is unconfigured or offline.

6. **Automated Testing Suite (23/23 Tests Passed):**
   - 11 core backend functional tests passed in `test_backend.py`.
   - 12 comprehensive edge-case tests passed in `test_production_edge_cases.py` covering Auth, RBAC, Validation, Deduplication, HTTP status codes, Dispatch state machines, GPS routing, Location persistence, and MongoDB fallback.

---

## 2. Root Cause Analysis Matrix

| Component | Failure Observed | Exact Technical Cause | Architectural Solution Applied | Verification |
| :--- | :--- | :--- | :--- | :--- |
| **Complaint Submit** | HTTP 500 / 401 | `Depends(get_current_user)` rejected unauthenticated citizen submissions; `timezone.utc` compared against SQLite naive strings; `raw_image_url` missing in schema | `get_current_user_optional` added; UTC timestamps standardized to naive format; schema updated with `raw_image_url` | Verified via `test_edge_case_4` & direct submissions |
| **Dispatch Button** | HTTP 500 `IntegrityError` | `task.id` evaluated to `None` prior to `db.flush()`; `AuditLog.entity_id` rejected `None` | Explicit `str(uuid.uuid4())` assigned; `db.flush()` called prior to audit logging; `AuditLog.entity_id` made nullable | Verified via `test_edge_case_6_dispatch_workflow` |
| **RBAC Security** | Privilege Escalation | `"admin" in allowed_roles` evaluated to `True` for all users on admin routes | Rewrote `require_roles` to verify `current_user.role in allowed_roles` | Verified via `test_edge_case_2_role_based_access_control` |
| **GPS Geocoding** | Raw Coordinates Only | Only bounding box snapping was available; no street address auto-detection | Integrated Nominatim OpenStreetMap API + local GIS fallback in `gis.py` | Verified via `test_edge_case_10` & `test_edge_case_8` |
| **Audit Storage** | Single SQL Failure Risk | Audit events were strictly synchronous SQL rows | Integrated MongoDB Atlas M0 dual-sync with non-blocking fallback | Verified via `test_edge_case_12_mongodb_fallback_resilience` |

---

## 3. User Roles & Access Control Matrix

| Portal Route | Allowed Roles | Functional Capabilities | Endpoint Protection |
| :--- | :--- | :--- | :--- |
| **`/citizen`** | `citizen`, `admin` | View personal complaint history, repair progress tracker, link to lodge new report | Protected by `ProtectedRoute` + `/complaints/my-complaints` |
| **`/authority`** | `nhai_authority`, `state_highway_authority`, `municipal_authority`, `admin` | Jurisdiction-scoped complaint queue, priority tier filtering, dispatch work order, reject with reason | Protected by `ProtectedRoute` + `/complaints` jurisdiction filtering |
| **`/maintenance`** | `maintenance_contractor`, `nhai_authority`, `state_highway_authority`, `municipal_authority`, `admin`, `field_inspector` | Active work orders, status progression (`Assigned` -> `In Progress` -> `Repair Completed`), post-repair photo upload & AI re-inspection | Protected by `ProtectedRoute` + `/maintenance/tasks` + `/maintenance/verify-repair` |
| **`/admin`** | `admin` | Host hardware telemetry (CPU, RAM, Storage), YOLOv8 model status, MongoDB Atlas sync diagnostics, registered user active toggles, audit stream, AHP weights | Protected by `require_roles([UserRole.ADMIN.value])` |
| **`/report`** | Public (Authenticated or Anonymous) | Optical pavement image upload, YOLOv8 perception, ASTM D6433 PCI score, GPS reverse geocoding, complaint lodging | `get_current_user_optional` (anonymous submissions permitted) |
| **`/track`** | Public | Public grievance tracking using minted reference code (e.g. `RG-261028-XXXX`) | Public endpoint (`/complaints/track/{ref}`) |
| **`/map`** | Public | Interactive Leaflet GIS map with surveyed corridors and active pavement distresses | Public endpoint (`/gis/map-layers`) |

---

## 4. Dual Database Architecture: SQL + MongoDB Atlas M0

```
┌────────────────────────────────────────────────────────┐
│               RoadGuard FastAPI Backend                │
└───────────┬────────────────────────────────┬───────────┘
            │                                │
            ▼                                ▼
┌───────────────────────────┐    ┌───────────────────────────┐
│  Relational Storage (SQL) │    │  Document Storage (NoSQL) │
│   SQLite / MySQL 8.x      │    │  MongoDB Atlas Free (M0)  │
├───────────────────────────┤    ├───────────────────────────┤
│ • users                   │    │ • audit_logs              │
│ • road_segments           │    │ • complaint_documents    │
│ • complaints              │    │   (GeoJSON 2dsphere index)│
│ • ai_detections           │    │ • ai_inspections          │
│ • maintenance_tasks       │    │ • telemetry               │
│ • repair_verifications    │    │                           │
│ • scoring_configs         │    │ (Failsafe non-blocking    │
│                           │    │  fallback if unconfigured)│
└───────────────────────────┘    └───────────────────────────┘
```

### MongoDB Setup Instructions (MongoDB Atlas M0 Free Tier)
1. Register for a free account at [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create an **M0 Free Shared Cluster** in your preferred region.
3. In **Database Access**, create a database user and password.
4. In **Network Access**, add IP `0.0.0.0/0` (allow access from anywhere) or your specific IP.
5. In **Database > Connect > Drivers**, copy the connection string:
   ```env
   MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority"
   MONGODB_DB_NAME="roadguard_logs"
   MONGODB_ENABLED="true"
   ```
6. Add this to your `.env` file in `roadguard/backend/.env`. If omitted, RoadGuard operates seamlessly in relational-only mode.

---

## 5. Verification & Test Suite Summary

Execution command: `python -m pytest roadguard/backend/tests -v`

```
============================= test session starts =============================
platform win32 -- Python 3.12.10, pytest-9.1.1, pluggy-1.7.0
rootdir: C:\Users\Lenovo\OneDrive\Desktop\Main Project
collected 23 items

roadguard/backend/tests/test_backend.py::test_password_hashing PASSED          [  4%]
roadguard/backend/tests/test_backend.py::test_user_registration_and_login PASSED [  8%]
roadguard/backend/tests/test_backend.py::test_gis_nhai_corridor_snapping PASSED [ 13%]
roadguard/backend/tests/test_backend.py::test_gis_state_highway_snapping PASSED [ 17%]
roadguard/backend/tests/test_backend.py::test_gis_unknown_location_routing PASSED [ 21%]
roadguard/backend/tests/test_backend.py::test_severity_calculation PASSED       [ 26%]
roadguard/backend/tests/test_backend.py::test_astm_pci_calculation PASSED       [ 30%]
roadguard/backend/tests/test_backend.py::test_maintenance_priority_engine PASSED [ 34%]
roadguard/backend/tests/test_backend.py::test_routine_monitoring_priority PASSED [ 39%]
roadguard/backend/tests/test_backend.py::test_ai_inference_pipeline PASSED       [ 43%]
roadguard/backend/tests/test_backend.py::test_mock_government_integration PASSED [ 47%]
roadguard/backend/tests/test_production_edge_cases.py::test_edge_case_1_auth_credentials PASSED [ 52%]
roadguard/backend/tests/test_production_edge_cases.py::test_edge_case_2_role_based_access_control PASSED [ 56%]
roadguard/backend/tests/test_production_edge_cases.py::test_edge_case_3_input_validation PASSED [ 60%]
roadguard/backend/tests/test_production_edge_cases.py::test_edge_case_4_database_integrity_and_deduplication PASSED [ 65%]
roadguard/backend/tests/test_production_edge_cases.py::test_edge_case_5_http_status_codes PASSED [ 69%]
roadguard/backend/tests/test_production_edge_cases.py::test_edge_case_6_dispatch_workflow PASSED [ 73%]
roadguard/backend/tests/test_production_edge_cases.py::test_edge_case_7_gps_routing_and_out_of_bounds PASSED [ 78%]
roadguard/backend/tests/test_production_edge_cases.py::test_edge_case_8_location_persistence PASSED [ 82%]
roadguard/backend/tests/test_production_edge_cases.py::test_edge_case_9_complaint_lifecycle PASSED [ 86%]
roadguard/backend/tests/test_production_edge_cases.py::test_edge_case_10_ai_response_fields PASSED [ 91%]
roadguard/backend/tests/test_production_edge_cases.py::test_edge_case_11_cryptographic_password_hashing PASSED [ 95%]
roadguard/backend/tests/test_production_edge_cases.py::test_edge_case_12_mongodb_fallback_resilience PASSED [100%]

================= 23 passed, 14 warnings in 123.89s =================
```

Frontend build: `npm --prefix roadguard/frontend run build` &rarr; `built in 20.33s` with 0 errors.

---

## 6. How to Run & Demonstrate

### 1-Click Launcher
Double-click `START_ROADGUARD.bat` in the root workspace directory.
- **Frontend URL:** [http://localhost:5173](http://localhost:5173)
- **API Swagger Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### Certified Demonstration Accounts (Password: `roadguard2026`)
| Role | Email | Demonstration Purpose |
| :--- | :--- | :--- |
| **Citizen** | `citizen@roadguard.org` | Lodge complaint, auto GPS reverse geocoding, track repair lifecycle |
| **NHAI Director** | `nhai@roadguard.org` | Review NH-16 corridor queue, dispatch work order, reject grievance |
| **State PWD Officer** | `pwd@roadguard.org` | Review AP State Highway corridor queue, dispatch contractor |
| **Municipal Officer** | `municipal@roadguard.org` | Review Tadepalligudem municipal road issues |
| **Maintenance Contractor**| `contractor@roadguard.org` | Receive work order, update progress, upload after-repair photo for automated YOLOv8 re-check |
| **System Administrator** | `admin@roadguard.org` | Host resource telemetry, MongoDB Atlas status, user activation toggle, audit stream |
