# RoadGuard: Master Project Repository
**Full Title:** RoadGuard: An Explainable Deep Learning-Based Road Damage Assessment and Intelligent Maintenance Prioritization System  
**Academic Target:** Final-Year B.Tech Major Project (2026–2027)  
**Institution:** Sri Vasavi Engineering College (Autonomous), Pedatadepalli, Tadepalligudem, AP  
**Department:** Department of Artificial Intelligence & Machine Learning  

---

## Workspace Directory Organization

```
Main Project/
├── START_ROADGUARD.bat           # 1-Click launcher (starts Backend + Frontend simultaneously)
├── README.md                     # Master workspace directory index
│
├── roadguard/                    # ★ COMPLETE PRODUCTION APPLICATION ★
│   ├── backend/                  # FastAPI 0.110 backend, SQLAlchemy 2.0, JWT auth, RBAC
│   ├── frontend/                 # React 18, TypeScript, Vite, Tailwind CSS, Leaflet OpenStreetMap
│   ├── ml/                       # YOLOv8s model (roadsense_best.pt, 21.48 MB), training & evaluation scripts
│   ├── docs/                     # 12 Technical specification documents & demo scripts
│   ├── sample_data/              # Verified test road distress images for live demonstration
│   ├── scripts/                  # Individual launch scripts (run_backend.bat, run_frontend.bat, run_tests.bat)
│   ├── docker-compose.yml        # Multi-container orchestration (MySQL 8 + Backend + Frontend)
│   ├── .env.example              # Environment configuration template
│   └── README.md                 # Detailed RoadGuard technical manual
│
├── academic_submissions/         # College Reviews, Presentations, Research Papers & Beamer Slides
│   ├── Review 1 PPT.pptx         # Official Review-1 PowerPoint presentation
│   ├── main project ppt.pdf      # Review presentation PDF
│   ├── PPT.pptx                  # Supplementary presentation slides
│   ├── RoadGuard_Review_I.tex    # LaTeX Beamer source code for Overleaf
│   ├── rev4.tex                  # Supplementary LaTeX document
│   ├── ABSTRACT.pdf              # Approved B.Tech project abstract
│   ├── Major Project Review I Circular.pdf  # College circular guidelines
│   ├── Automated_Pavement_Distress_Detection_Based_on_Convolutional_Neural_Network.pdf # Base research paper
│   ├── ROADGUARD_FINAL_SUBMISSION_PACKAGE.md # Comprehensive submission package summary
│   └── slides/                   # Rendered slide PNGs (slides 1 to 23)
│
├── datasets/                     # Computer Vision Datasets
│   ├── DATASET/                  # Full multi-class pavement dataset (RDD2022 India & international)
│   ├── test/                     # Validation & test splits
│   └── val/                      # Cross-validation splits
│
└── legacy_prototypes/            # Preserved Phase 1 & Streamlit Prototypes
    ├── project/                  # Earlier Streamlit prototype & training checkpoints
    └── roadguard_core/           # Earlier core research modules
```

---

## Quickstart

Double-click **`START_ROADGUARD.bat`** to start both:
- **Web Application:** `http://localhost:5173`
- **FastAPI API & Documentation:** `http://127.0.0.1:8000/docs`

Default demo account password: `roadguard2026`
