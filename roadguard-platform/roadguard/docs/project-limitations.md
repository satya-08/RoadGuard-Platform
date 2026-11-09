# RoadGuard: System Boundaries & Project Limitations

In adherence to Non-Negotiable Implementation Rules 6, 7, and 17, this document records the truthful system boundaries, technical assumptions, and deliberate fallbacks implemented in RoadGuard:

---

## 1. Computer Vision & Sensor Boundaries
1. **Volumetric Pothole Depth:** RoadGuard estimates physical severity ($S_i$) using 2D image-derived proxies (normalized cavity area, aspect ratio, Laplacian texture variance, and shadow contrast). The system does **not** claim to provide millimeter-accurate physical depth measurements from single uncalibrated 2D RGB mobile images. Volumetric depth measurements require calibrated stereo-vision or LiDAR sensors.
2. **Current Model Class Scope:** The active deployed YOLO checkpoint (`roadsense_best.pt`) is trained on 3 primary structural distress classes: `pothole`, `crack`, and `open_manhole`. Fine-tuning scripts for extended classes (such as longitudinal, transverse, and alligator cracks individually) are provided in `ml/scripts/train_yolo.py`.
3. **Motion Blur Threshold:** Frames with Laplacian variance below $\sigma^2 < 80.0$ are flagged with a quality warning indicating reduced sensitivity.
4. **Nighttime & Heavy Rain Ingestion:** Extremely low-light imagery without vehicular headlight illumination or water-submerged roads (where standing water reflects sky illumination) degrades optical detection accuracy.

---

## 2. Geospatial & Jurisdiction Scope
1. **Configured Demonstration Testbed:** The GIS network currently encompasses four vectorized road corridors in the Pedatadepalli - Tadepalligudem region (NH-16 Bypass, State Highway SVEC Road, and Municipal Ward Streets).
2. **Ambiguity Handling:** When an uploaded coordinate is located $> 350\text{ m}$ away from any registered corridor, RoadGuard sets `requires_manual_routing = True` and routes the record to the district manual review queue. The system **never** invents an authority or guesses arbitrarily.

---

## 3. External Government API Integrations
1. **Demonstration Adapters:** Because official write access to live government production endpoints (e.g. CPGRAMS, MoRTH, NHAI portal) requires institutional government API keys and bilateral MoUs, all external portal dispatches in RoadGuard are mediated by clearly labeled demonstration adapters.
2. **Disclaimer:** Every mock submission visibly outputs the required academic disclaimer: *"ATTENTION: This is a simulated mock integration response for academic evaluation purposes only. No actual official government agency has received this transmission."*
