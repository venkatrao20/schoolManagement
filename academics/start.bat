@echo off
REM ==========================================================
REM School Management App - Academics Module
REM One-click starter for Windows
REM ==========================================================
cd /d "%~dp0backend"

IF NOT EXIST node_modules (
    echo Installing dependencies (first run only)...
    call npm install
)

echo.
echo ==================================================
echo  Starting School Management App - Academics Module
echo  Once started, open: http://localhost:4000
echo ==================================================
echo.

call npm start
pause
