@echo off
REM Starts the TravelMate AI frontend on http://localhost:5173
cd /d "%~dp0"
call npm.cmd run dev
echo.
echo Frontend stopped. Press any key to close this window.
pause >nul
