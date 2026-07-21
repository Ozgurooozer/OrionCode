@echo off
cd /d "%~dp0"
echo Beta3 — Quick test (single frame render + verify pixel buffer)
node test-babylon-puppeteer.js
if %errorlevel% neq 0 (
  echo FAILED - see error above
  pause
  exit /b 1
)
echo PASS
pause
