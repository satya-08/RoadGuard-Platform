@echo off
echo ========================================================
echo Running RoadGuard Automated Pytest Suite...
echo ========================================================
cd /d "%~dp0..\.."
python -m pytest roadguard/backend/tests/test_backend.py -v
pause
