@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if not errorlevel 1 (
  start "Vitalcar - servidor local" /min cmd /k "py -m http.server 8000 --bind 127.0.0.1"
) else (
  where python >nul 2>nul
  if errorlevel 1 (
    echo Python nao foi encontrado. Instale Python ou abra o site com um servidor local.
    pause
    exit /b 1
  )
  start "Vitalcar - servidor local" /min cmd /k "python -m http.server 8000 --bind 127.0.0.1"
)
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8000/"
endlocal
