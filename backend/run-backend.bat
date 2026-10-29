@echo off
REM Starts the TravelMate AI backend on http://localhost:8000
REM Uses the bundled Python runtime, so no system Python install is required.
cd /d "%~dp0"
".tools\python\python.exe" -m uvicorn app.main:app --reload --port 8000
echo.
echo Backend stopped. Press any key to close this window.
pause >nul
