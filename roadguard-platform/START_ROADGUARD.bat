@echo off
title RoadGuard Launcher
echo ===============================================================================
echo            RoadGuard: Intelligent Road Damage Assessment Platform
echo ===============================================================================
echo.
echo [1/2] Starting RoadGuard FastAPI Backend on http://127.0.0.1:8000 ...
start "RoadGuard Backend (FastAPI)" cmd /k "cd /d %~dp0 && python -m uvicorn roadguard.backend.app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Starting RoadGuard React Vite Frontend on http://localhost:5173 ...
start "RoadGuard Frontend (React + Vite)" cmd /k "cd /d %~dp0roadguard\frontend && npm run dev"

echo.
echo ===============================================================================
echo RoadGuard is launching!
echo - Web Application:      http://localhost:5173
echo - API Documentation:    http://127.0.0.1:8000/docs
echo - Demo Accounts:        Default Password is 'roadguard2026'
echo ===============================================================================
echo.
timeout /t 5
