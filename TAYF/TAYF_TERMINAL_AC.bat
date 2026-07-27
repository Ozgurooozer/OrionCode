@echo off
chcp 65001 > nul
cd /d "%~dp0"

where python > nul 2>&1
if errorlevel 1 (
    echo HATA: python bulunamadi.
    pause
    exit /b 1
)

if not exist ".tayf" mkdir ".tayf"
if not exist ".tayf\kanal.jsonl" type nul > ".tayf\kanal.jsonl"

echo ============================================================
echo  TAYF Terminal - Paylasimli Agent Terminali
echo  Ctrl+C ile kapat
echo ============================================================
echo.

python tayf_terminal.py .tayf\kanal.jsonl
echo.
pause
