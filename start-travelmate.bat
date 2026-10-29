@echo off
REM Double-click this file to start TravelMate AI.
REM It opens the backend and frontend in separate windows, then opens the app.
setlocal
start "TravelMate Backend" "%~dp0backend\run-backend.bat"
start "TravelMate Frontend" "%~dp0frontend\run-frontend.bat"

echo Waiting for the servers to start...
timeout /t 8 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo TravelMate AI should now be open at http://localhost:5173
echo Close the two server windows to stop the app.
timeout /t 5 /nobreak >nul
endlocal
