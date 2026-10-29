@echo off
REM Starts the TravelMate AI backend on http://localhost:8000
REM Works with a local .venv, the bundled .tools runtime, or system Python.
cd /d "%~dp0"

set "PY="
if exist ".venv\Scripts\python.exe" set "PY=.venv\Scripts\python.exe"
if not defined PY if exist ".tools\python\python.exe" set "PY=.tools\python\python.exe"
if not defined PY (
    where py >nul 2>&1 && set "PY=py"
)
if not defined PY (
    where python >nul 2>&1 && set "PY=python"
)

if not defined PY (
    echo.
    echo ERROR: Python 3.11 or newer was not found.
    echo Install it from https://www.python.org/downloads/ and enable "Add to PATH",
    echo or create a virtual environment with: py -m venv .venv
    echo.
    pause
    exit /b 1
)

echo Using Python: %PY%
"%PY%" -m uvicorn app.main:app --reload --port 8000
echo.
echo Backend stopped. Press any key to close this window.
pause >nul
