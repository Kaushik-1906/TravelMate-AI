@echo off
REM Double-click this file to start TravelMate AI.
REM It opens the backend and frontend in separate windows, then opens the app.
setlocal

REM Make Node.js available even when this window was opened with a stale PATH.
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"

start "TravelMate Backend" "%~dp0backend\run-backend.bat"
start "TravelMate Frontend" "%~dp0frontend\run-frontend.bat"

echo Waiting for the servers to start...
timeout /t 10 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo TravelMate AI should now be open at http://localhost:5173
echo Close the two server windows to stop the app.
timeout /t 5 /nobreak >nul
endlocal
