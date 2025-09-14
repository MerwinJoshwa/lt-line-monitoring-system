@echo off
echo.
echo ============================================================
echo 🚀 LT Line Monitoring System - Opening Dashboard
echo ============================================================
echo.
echo 📊 Opening dashboard in your default browser...
echo 🔗 URL: file://%~dp0frontend/index.html
echo.
echo 💡 Make sure the backend is running:
echo    cd backend
echo    python app_demo.py
echo.
echo ============================================================
echo.

start "" "file://%~dp0frontend/index.html"

echo ✅ Dashboard opened! Select a transformer to view live data.
echo.
pause
