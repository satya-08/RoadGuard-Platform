# 🛣️ RoadGuard
### AI-Based Road Damage Assessment and Intelligent Maintenance Prioritization System

[![Production Status](https://img.shields.io/badge/Status-Production%20Ready-emerald.svg)](#)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite%20%2B%20Tailwind-blue.svg)](#)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20%2B%20Python%203.11-teal.svg)](#)
[![Computer Vision](https://img.shields.io/badge/AI%2FCV-YOLOv8%20%2B%20Sobel%20XAI%20%2B%20Laplacian-orange.svg)](#)

---

## 📌 About the Project

**RoadGuard** is an end-to-end intelligent road infrastructure inspection and maintenance management framework. It leverages computer vision and deep learning (YOLOv8) combined with Explainable AI (XAI Sobel-Laplacian saliency heatmaps), Geographic Information Systems (GIS), and Analytic Hierarchy Process (AHP) multi-criteria prioritization.

The system empowers municipal bodies and national highway authorities to automatically detect surface defects (potholes, structural fractures, alligator cracks, displaced manholes), compute standardized Pavement Condition Index (PCI) scores, and rank maintenance urgency to prevent traffic accidents before they occur.

---

## 🏗️ Project Architecture

```text
Main-project-Road-Guard-/
│
├── .github/                         <-- CI/CD Workflows
├── README.md                        <-- Repository Documentation
├── package-lock.json                <-- Pinned repository config
│
└── roadguard-platform/              <-- Core Platform Directory
    ├── START_ROADGUARD.bat          <-- Local 1-Click Launch Script
    ├── academic_submissions/        <-- Project Presentations, Reports & Papers
    │   ├── RoadGuard_Project_Presentation.pdf
    │   └── ROADGUARD_FINAL_SUBMISSION_PACKAGE.md
    │
    ├── legacy_prototypes/           <-- Research Prototypes & Exploratory Models
    │
    └── roadguard/                   <-- ACTIVE PRODUCTION APPLICATION
        ├── backend/                 <-- FastAPI REST API Service
        │   ├── app/
        │   │   ├── main.py          <-- FastAPI Entry Point
        │   │   ├── ai/              <-- YOLOv8 + Laplacian + Sobel XAI Engine
        │   │   ├── api/v1/          <-- Authentication, GIS, Complaints, Maintenance
        │   │   ├── core/            <-- Config, Database (PostgreSQL/SQLite), JWT
        │   │   ├── gis/             <-- Spatial Road Network Snapping Engine
        │   │   ├── models/          <-- SQLAlchemy ORM Entities
        │   │   └── priority/        <-- AHP Multi-Criteria Prioritization & PCI
        │   ├── uploads/             <-- Static media & annotated detection overlays
        │   ├── Dockerfile           <-- Production Container Definition
        │   └── requirements.txt     <-- Production Python Dependencies
        │
        ├── frontend/                <-- React 19 + TypeScript + Vite SPA
        │   ├── public/              <-- SEO Assets (robots.txt, sitemap.xml, favicon.svg)
        │   ├── src/
        │   │   ├── services/api.ts  <-- Production API Client
        │   │   ├── pages/           <-- Citizen, Authority, Map, Vision, XAI Dashboards
        │   │   └── components/      <-- Leaflet Maps, Modal Dialogs, KPI Widgets
        │   ├── vercel.json          <-- Vercel Deployment & Reverse Proxy Rewrites
        │   └── package.json         <-- Node Dependencies
        │
        ├── ml/                      <-- YOLO Model Configs & Evaluation Scripts
        └── docker-compose.yml       <-- Full-Stack Container Orchestration
```

---

## 🚀 Live Cloud Deployment Setup

### 1. Frontend (Vercel)
* **Framework Preset**: Vite
* **Root Directory**: `roadguard-platform/roadguard/frontend`
* **Build Command**: `npm run build`
* **Output Directory**: `dist`
* **Environment Variable**: `VITE_API_BASE_URL` (Points to your live backend URL)

### 2. Backend (Render / Railway)
* **Environment**: Python 3.11
* **Root Directory**: `roadguard-platform/roadguard` (or run from root with `PYTHONPATH=roadguard-platform`)
* **Build Command**: `pip install -r roadguard/backend/requirements.txt`
* **Start Command**: `uvicorn roadguard.backend.app.main:app --host 0.0.0.0 --port 8000`

---

## 🛠️ Local Development Quick Start

Run the automated launcher:
```bat
cd roadguard-platform
START_ROADGUARD.bat
```
* **Frontend Web App**: `http://localhost:5173`
* **Backend Swagger API**: `http://127.0.0.1:8000/docs`
* **Default Demo Login**: Password is `roadguard2026`
