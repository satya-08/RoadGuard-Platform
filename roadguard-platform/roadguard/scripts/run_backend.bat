@echo off
echo ========================================================
echo Starting RoadGuard FastAPI Backend Server...
echo API Base: http://127.0.0.1:8000
echo Swagger Documentation: http://127.0.0.1:8000/docs
echo ========================================================
cd /d "%~dp0..\.."
python -m uvicorn roadguard.backend.app.main:app --host 127.0.0.1 --port 8000 --reload
pause
