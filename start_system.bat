@echo off
title LT Line Monitoring System - Startup

echo.
echo ============================================================
echo 🚀 LT Line Monitoring System - Complete Startup
echo ============================================================
echo.
echo Starting backend server and opening dashboard...
echo.

cd /d "%~dp0backend"

echo 📡 Starting Flask backend server...
echo 🔗 Backend will be available at: http://localhost:5000
echo.
echo 💡 The dashboard will open automatically in 5 seconds...
echo 💡 Press Ctrl+C to stop the backend server
echo.
echo ============================================================

timeout /t 5 /nobreak >nul

REM Start dashboard in background
start "" "file://%~dp0frontend/index.html"

echo ✅ Dashboard opened in browser!
echo 📊 Backend starting now...
echo.

REM Start the Flask backend (this will block)
python app_demo.py

echo.
echo 🛑 Backend stopped.
pause
