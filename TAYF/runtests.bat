@echo off
chcp 65001 > nul
echo === TAYF Kok Testleri ===
python -m pytest -q
if errorlevel 1 goto fail

echo.
echo === tayf+0 Testleri ===
cd tayf+0
python -m pytest -q
if errorlevel 1 goto fail
cd ..

echo.
echo === tayf+1 Testleri ===
cd tayf+1
python -m pytest -q
if errorlevel 1 goto fail
cd ..

echo.
echo === promplar ve gorevler Testleri ===
cd "promplar ve gorevler"
python -m pytest -q
if errorlevel 1 goto fail
cd ..

echo.
echo [TAMAM] Tum testler gecti.
exit /b 0

:fail
echo.
echo [HATA] Test basarisiz.
exit /b 1
