@echo off
REM Starts the TravelMate AI frontend on http://localhost:5173
REM Locates Node.js/npm even if it is not on this terminal's PATH.
cd /d "%~dp0"

set "NPM="
for /f "delims=" %%I in ('where npm.cmd 2^>nul') do if not defined NPM set "NPM=%%I"

if not defined NPM if exist "%ProgramFiles%\nodejs\npm.cmd" set "NPM=%ProgramFiles%\nodejs\npm.cmd"
if not defined NPM if exist "%LOCALAPPDATA%\Programs\nodejs\npm.cmd" set "NPM=%LOCALAPPDATA%\Programs\nodejs\npm.cmd"

if not defined NPM (
    echo.
    echo ERROR: Node.js / npm was not found on this computer.
    echo Install Node.js 18 or newer from https://nodejs.org and try again.
    echo.
    pause
    exit /b 1
)

REM Make node.exe visible to Vite and other child processes.
for %%I in ("%NPM%") do set "NODE_DIR=%%~dpI"
set "PATH=%NODE_DIR%;%PATH%"

echo Using npm: %NPM%
call "%NPM%" run dev
echo.
echo Frontend stopped. Press any key to close this window.
pause >nul
