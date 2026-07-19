@echo off
setlocal

cd /d "%~dp0"

set NEED_INSTALL=0

if not exist node_modules set NEED_INSTALL=1

rem node_modules Linux tarafinda (Claude'un sandbox'inda) olusturulmus olabilir —
rem esbuild/electron platform-ozel binary'leri o zaman Windows icin eksik kalir.
rem Bu isaretlerden biri eksikse temiz kurulum yapilir.
if not exist node_modules\@esbuild\win32-x64 set NEED_INSTALL=1
if not exist node_modules\electron\dist\electron.exe set NEED_INSTALL=1

if %NEED_INSTALL%==1 (
  echo [orion] Windows icin uyumlu kurulum bulunamadi, temizleniyor...
  if exist node_modules rmdir /s /q node_modules
  if exist package-lock.json del /f /q package-lock.json
  echo [orion] bagimliliklar kuruluyor, ilk calistirmada biraz surebilir...
  call npm install
  if errorlevel 1 (
    echo [orion] npm install basarisiz oldu.
    pause
    exit /b 1
  )
)

echo [orion] Orion Desktop baslatiliyor...
call npm start

if errorlevel 1 (
  echo [orion] uygulama hata ile kapandi.
  pause
)
