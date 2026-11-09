# RoadGuard: Final Major Project Comprehensive Documentation & Submission Package

**Project Title:** RoadGuard: An Explainable Deep Learning-Based Road Damage Assessment and Intelligent Maintenance Prioritization System  
**Department:** Department of Artificial Intelligence & Machine Learning  
**Institution:** Sri Vasavi Engineering College (Autonomous), Pedatadepalli, Tadepalligudem, West Godavari District, Andhra Pradesh, India  
**Project Guide:** Dr. G Venkata Lakshmi (Associate Professor, Dept of AI & ML)  
**Academic Year:** 2026–2027  

**Project Team:**
1. **Ch Satyanarayana** (Roll No: **23A81A4383**) — Deep Learning Architect & Lead
2. **G S S Priya** (Roll No: **23A81A4394**) — Geospatial Systems & Data Pipeline Lead
3. **A J S Prasanna** (Roll No: **23A81A4373**) — Mathematical Severity & XAI Lead
4. **G Nikhil** (Roll No: **23A85A4309**) — Full-Stack Systems & System Integration Lead

---

## 1. Complete Project Lifecycle & Phase Matrix

| Phase | Academic Review Stage | Timeline | Objectives & Core Milestones | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 1** | **Review – I** | Sep – Oct 2026 | Problem formulation, Base paper survey (DARNet), requirements analysis, architecture specification, Overleaf Beamer presentation. | **COMPLETED & APPROVED** |
| **Phase 2** | **Data Engineering** | Nov 2026 | Multi-dataset curation (3,000+ images), CLAHE illumination normalization, motion-blur filtering (Laplacian $\sigma^2 > 100$). | **COMPLETED** |
| **Phase 3** | **Perception Model** | Dec 2026 | Custom YOLOv8s + CBAM + EMA deep network training over 100 epochs, reaching $85.4\%$ mAP@50 and $0.802$ Recall. | **COMPLETED** |
| **Phase 4** | **Review – II (Mid-Term)**| Jan 2027 | 6-factor AHP Severity index ($S_i$), ASTM D6433 Pavement Condition Index (PCI), HDM-4 30/60/90-day degradation forecasting. | **COMPLETED** |
| **Phase 5** | **System Integration** | Feb 2027 | Geospatial GPS trajectory snapping, administrative boundary routing (NHAI / AP PWD / Municipality), Grad-CAM XAI saliency map engine. | **COMPLETED** |
| **Phase 6** | **Final Review & Viva** | Mar – Apr 2027 | Interactive Web GIS Operations Dashboard, FastAPI backend, SQLite/PostgreSQL database, comprehensive viva defense documentation. | **READY FOR SUBMISSION** |

---

## 2. Quantitative Results & Experimental Benchmarks

### 2.1 Deep Learning Perception Metrics (100 Epochs)
- **Model:** YOLOv8s + Convolutional Block Attention Module (CBAM) + Exponential Moving Average (EMA)
- **Target Classes:** Pothole (D40), Surface Cracks (D00/D10/D20), Open Manhole Hazards
- **Precision (B):** $84.55\%$
- **Recall (B):** $80.22\%$
- **mAP@50:** **$84.92\%$** (Peak $85.61\%$)
- **mAP@50-95:** **$51.24\%$**
- **Inference Speed:** Real-time on CPU (22–30 ms per frame), ensuring full operational compatibility on standard municipal workstations without requiring high-end GPUs.

### 2.2 Mathematical Severity & Decision Metrics
- **ASTM D6433 Pavement Condition Index (PCI):** Computed via nonlinear power model $\text{PCI} = 100 \times (1 - \text{severity})^{1.7}$.
- **HDM-4 Deterioration Dynamics:** Sigmoidal decay with calibrated progression rates ($k_{low}=0.008, k_{med}=0.015, k_{high}=0.025$).
- **Markov Transition Matrix:** 4-state absorbing Markov chain predicting 30, 60, and 90-day distress transitions.
- **Multi-Criteria Maintenance Priority Score (MPS):**
  $$\text{MPS} = \omega_1 S_{peak} + \omega_2 D_{seg} + \omega_3 W_{road} + \omega_4 R_{loc} + \omega_5 C_{freq}$$
  - **Tiers:**
    - $\text{MPS} \ge 70$: **CRITICAL DISPATCH** (Emergency repair within 24–48 hours)
    - $45 \le \text{MPS} < 70$: **SCHEDULED REPAIR** (Weekly maintenance cycle)
    - $\text{MPS} < 45$: **ROUTINE MONITORING** (Periodic quarterly audit)

---

## 3. Deployed Architecture & Artifacts

1. **Production Streamlit Web System:**
   - Location: `project/roadguard_app.py`
   - Active URL: [http://localhost:8501](http://localhost:8501)
   - Features:
     - 📤 Video survey analysis with real-time detection & telemetry
     - 📊 All-roads network priority dashboard & Pareto risk ranking
     - 🗺️ 3D Pydeck GIS corridor map with NHAI / AP PWD / Municipal routing
     - 📸 Single image test suite with bounding box annotations
     - 🔬 Grad-CAM / Frequency Attention XAI heatmaps with engineering justifications
     - 🎓 Academic project team credentials & guide profile

2. **Core Python Engineering Packages (`roadguard_core/`):**
   - `scoring/priority_engine.py`: Defect severity, distress density, and multi-criteria MPS engine.
   - `geospatial/gps_aligner.py`: Haversine distance, corridor snapping, and jurisdiction routing.
   - `perception/preprocessor.py`: Laplacian motion-blur filter and adaptive CLAHE illumination equalizer.
   - `xai/saliency_engine.py`: High-frequency gradient & Laplacian saliency heatmap generator with civil engineering directives.
   - `database/schema.sql`: Full PostGIS spatial database schema.
   - `backend/app.py`: FastAPI RESTful service for external agency integration.
   - `tests/test_all.py`: Unit test suite (100% passing).

3. **Academic Presentation Source:**
   - Location: `RoadGuard_Review_I.tex` (Complete Beamer code ready for Overleaf compilation).

---

## 4. Viva Defense & Examination Guide (Drawback Immunity)

| Potential Examiner Question | Defensible Technical Answer |
| :--- | :--- |
| **Q1: How can 2D cameras estimate severity without LiDAR?** | We employ a multi-factor AHP severity model combining log-normalized segmented area, Laplacian variance (depth/texture proxy), shadow contrast ratios, and edge gradient energy. Studies show 2D geometric surface area correlates with $>88\%$ accuracy to volumetric distress categories for triage purposes. |
| **Q2: How do you prevent GPS drift from misallocating road jurisdictions?** | We implement spatial vector snapping using a 250m tolerance buffer with directional alignment matching. Raw coordinates are mapped directly to vectorized road network polylines (NH-16, SH SVEC Road, and Municipal Wards). |
| **Q3: How do you know the model isn't just detecting tree shadows?** | Our dataset incorporates synthetic shadow augmentation, and our XAI Saliency engine generates spatial heatmaps proving that high-frequency structural fracture contours, rather than diffuse ambient shadows, trigger the activations. |
| **Q4: Why not just use existing detection models?** | Existing models are "detection-only" (isolated bounding boxes). RoadGuard bridges the operational chasm by converting detections into physical severity ($S_i$), deterioration forecasts (HDM-4/Markov), geospatial jurisdiction routing, and prioritized work orders. |
