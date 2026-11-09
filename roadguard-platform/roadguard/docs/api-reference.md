# RoadGuard RESTful API Reference Manual
**Base URL:** `http://localhost:8000/api/v1`  
**Interactive OpenAPI UI:** `http://localhost:8000/docs`  
**ReDoc Specification:** `http://localhost:8000/redoc`  

---

## 1. Authentication & RBAC

### `POST /auth/login`
Authenticates a user and returns a Bearer JWT access token.
- **Request Body:**
  ```json
  {
    "email": "municipal@roadguard.org",
    "password": "roadguard2026"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer",
    "role": "municipal_authority",
    "user": {
      "id": "uuid-...",
      "email": "municipal@roadguard.org",
      "full_name": "K. Lakshmi (Municipal Engineering Officer)",
      "role": "municipal_authority"
    }
  }
  ```

### `POST /auth/seed-demo-users`
Provisions 7 realistic demonstration accounts across all roles with default password `roadguard2026`.

---

## 2. Citizen Grievance & AI Perception

### `POST /complaints/analyze-upload`
Uploads an optical road image (multipart/form-data), runs YOLOv8 perception, evaluates Laplacian sharpness, applies CLAHE illumination normalization, and returns Explainable AI (XAI) saliency maps.
- **Form Data:** `file: [binary image]`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "total_detections": 1,
    "detections": [
      {
        "defect_class": "pothole",
        "confidence": 0.8212,
        "bbox": { "xmin": 0.002, "ymin": 0.005, "xmax": 0.995, "ymax": 1.0 },
        "severity_score": 0.8284,
        "severity_level": "Critical"
      }
    ],
    "peak_severity": 0.8284,
    "pci_score": 12.4,
    "annotated_image_url": "/uploads/annotated/annotated_raw_1234.jpg",
    "xai_heatmap_url": "/uploads/xai/xai_raw_1234.jpg",
    "model_version": "YOLOv8s-RoadSense-v1.0"
  }
  ```

### `POST /complaints/submit`
Submits a confirmed complaint with coordinates, snaps to jurisdiction, and mints reference number.
- **Response `201 Created`:** Returns complaint entity with `reference_no: "RG-261018-ABCD"`.

### `GET /complaints/track/{ref_no}`
Public endpoint for tracking lifecycle status and evidence without requiring authentication.

---

## 3. GIS & Road Network

### `POST /gis/snap`
Snaps GPS coordinate to surveyed road network.
- **Request Body:** `{ "latitude": 16.8260, "longitude": 81.5210 }`
- **Response `200 OK`:**
  ```json
  {
    "matched": true,
    "distance_meters": 34.2,
    "segment_code": "SEG-NH16-TPG-01",
    "road_name": "NH-16 Tadepalligudem Bypass",
    "hierarchy": "NH",
    "jurisdiction": "National Highways Authority of India (NHAI)",
    "responsible_authority": "National Highways Authority of India (NHAI)"
  }
  ```

### `GET /gis/map-layers`
Returns GeoJSON-compatible corridor polylines and active defect points for Leaflet map rendering.

---

## 4. Maintenance Workflow & Verification

### `POST /maintenance/tasks`
Creates a work order task assigned to a contractor.

### `POST /maintenance/verify-repair`
Uploads after-repair evidence photo, runs AI re-detection, and validates whether the pothole has been eliminated.
- **Outputs:** `Verification Passed`, `Verification Failed`, or `Inconclusive - Manual Inspection Required`.

---

## 5. Mock External Government Integrations

### `POST /integrations/mock-authority-submit`
Simulates outward dispatch to CPGRAMS or NHAI Rah-Bharosa with explicit demonstration tags and mock reference codes.
