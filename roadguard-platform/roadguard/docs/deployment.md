# RoadGuard Deployment & Operation Manual

## 1. Prerequisites
- **Operating System:** Windows 10/11, Ubuntu 22.04 LTS, or macOS
- **Python:** Version 3.10 to 3.12 (`python --version`)
- **Node.js & npm:** Node.js v18+ (`node -v`) and npm v9+ (`npm -v`)
- **Database:** SQLite 3 (included with Python) or MySQL 8.x

---

## 2. Local Development Startup (Zero Configuration)

### Step 1: Start Backend API (FastAPI)
Open a terminal in `Main Project/roadguard`:
```powershell
python -m uvicorn roadguard.backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Base: `http://127.0.0.1:8000`
- Interactive Swagger Docs: `http://127.0.0.1:8000/docs`

### Step 2: Start Frontend Application (Vite + React)
Open a second terminal in `Main Project/roadguard/frontend`:
```powershell
npm run dev
```
- Web Application: `http://localhost:5173`

---

## 3. Pre-Configured Demonstration Accounts

| Role | Email | Password | Pre-configured Jurisdiction |
| :--- | :--- | :--- | :--- |
| **Citizen** | `citizen@roadguard.org` | `roadguard2026` | Civilian Resident (Ward 5) |
| **Field Inspector** | `inspector@roadguard.org` | `roadguard2026` | Quality Inspection Division |
| **Municipal Officer** | `municipal@roadguard.org` | `roadguard2026` | Tadepalligudem Municipal Corporation |
| **State Highway PWD** | `pwd@roadguard.org` | `roadguard2026` | AP State PWD (Roads & Buildings) |
| **NHAI Director** | `nhai@roadguard.org` | `roadguard2026` | NHAI PIU Rajahmundry (NH-16) |
| **Contractor** | `contractor@roadguard.org` | `roadguard2026` | Sri Sai Asphalt Contractors |
| **System Admin** | `admin@roadguard.org` | `roadguard2026` | Central System Administrator |

---

## 4. Docker Deployment (Optional Production Setup)
```bash
docker-compose up --build -d
```
- Spawns MySQL 8 container, FastAPI backend, and Nginx frontend.
