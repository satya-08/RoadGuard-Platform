# RoadGuard: Final Viva Defense & Demonstration Script

**Duration:** 10–15 Minutes  
**Demonstrator:** Academic Project Team  
**System URL:** `http://localhost:5173` (Frontend) & `http://localhost:8000/docs` (FastAPI)  

---

## Step 1: System Introduction & Academic Credentials (1 Min)
1. Open the homepage at `http://localhost:5173`.
2. Point out the academic badge: *Final Year B.Tech Major Project (2026–2027) | Department of AI & ML, Sri Vasavi Engineering College (Autonomous)*.
3. State the core research objective: RoadGuard is an end-to-end cyber-physical system connecting optical AI detection with physical pavement severity (ASTM D6433 PCI), geospatial authority routing (NHAI, AP PWD, Municipality), and post-repair optical closure verification.

---

## Step 2: Citizen Distress Reporting & Real-Time AI Inference (3 Mins)
1. Navigate to **Report Damage** (`/report`).
2. Upload the sample pavement photo from `roadguard/sample_data/sample_pothole_critical.jpg`.
3. Click **"Run AI Damage & Saliency Analysis"**.
4. Highlight the instant AI results:
   - **YOLOv8 Detection:** Bounding box accurately localized around the road cavity.
   - **Explainable AI (XAI) Saliency Map:** Gradient energy & Laplacian curvature heatmap displaying fracture boundaries.
   - **Civil Engineering Justification:** Human-readable reasoning explaining why the AI flagged the hazard (e.g. cavity frame occupancy, tyre strike hazard, recommended full-depth patch).
   - **Severity & PCI Score:** Defect Severity $S_i = 0.83$ (Critical) & ASTM D6433 PCI = $12.4 / 100$.
5. Select a preset corridor:
   - Click **"NH-16 Bypass (NHAI)"** &rarr; Notice autonomous routing to **National Highways Authority of India (NHAI)**.
   - Or click **"SVEC College Road (AP PWD)"** &rarr; Notice routing to **Andhra Pradesh State PWD (Roads & Buildings)**.
6. Click **"Confirm & Lodge Formal Report"**.
7. Copy the minted reference code (e.g. `RG-261018-ABCD`).

---

## Step 3: Interactive Geospatial Corridor Map (2 Mins)
1. Navigate to **Network Map** (`/map`).
2. Show the color-coded corridors:
   - Blue polyline: NH-16 Bypass.
   - Purple polyline: Pedatadepalli - SVEC Road.
   - Green polyline: Municipal Ward 5.
3. Click on the circular distress marker at the reported location to reveal popup telemetry, photo thumbnail, severity level, and responsible agency.
4. Toggle the **Filter Authority** buttons (NHAI, PWD, Municipality) to showcase administrative filtering.

---

## Step 4: Municipal Authority Command Center (3 Mins)
1. Switch to the Municipal or NHAI Officer account using the top **"Demo Roles"** dropdown (or login with `municipal@roadguard.org`).
2. Navigate to **Authority Portal** (`/authority`).
3. Inspect the KPI cards: Total Reports, Pending Review, Critical Dispatches (MPS &ge; 70), Average Network PCI.
4. Locate the newly submitted complaint in the **Grievance Triage Table**.
5. Click **"Dispatch Task"**:
   - Assign to contractor: `Sri Sai Pavement Works & Asphalt Contractors`.
   - Work directives: `Cold milling and 50mm Bituminous Concrete overlay`.
   - Submit: Notice the complaint state transitions to `Assigned` with work order `WO-YYMMDD-XXXX`.

---

## Step 5: Contractor Execution & Post-Repair Optical Verification (3 Mins)
1. Switch to the Contractor account (`contractor@roadguard.org`) or navigate to **Maintenance Tasks** (`/maintenance`).
2. Locate the assigned work order card.
3. Click **"Acknowledge & Start Repair"** &rarr; Status changes to `In Progress`.
4. Click **"Upload Repair Evidence & Run AI Verification"**.
5. Upload the repaired road photo from `roadguard/sample_data/sample_surface_crack.jpg` (or any clean asphalt surface photo).
6. Click **"Verify Repair with AI"**:
   - The backend runs YOLOv8 re-detection on the after-repair photo.
   - Displays **Before vs. After side-by-side visual comparison**.
   - Output: **`Verification Passed`** (Structural cavity eliminated; residual defects = 0).
7. Authority approves closure &rarr; Work order and complaint transition to **`Closed`**.

---

## Step 6: System Administration & Mock Government Gateway (2 Mins)
1. Switch to Admin account (`admin@roadguard.org`) and go to `/admin`.
2. Review real-time host hardware diagnostics (CPU, RAM, YOLO model active status).
3. Demonstrate the **Mock Government System Integration**:
   - Dispatch to CPGRAMS or NHAI Rah-Bharosa.
   - Point out the generated mock reference number and explicit academic demonstration disclaimer.
4. Conclude with the immutable **Audit Trail** proving complete accountability.
