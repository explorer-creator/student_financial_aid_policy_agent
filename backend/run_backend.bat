@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo   Working directory: %CD%
echo   Must contain: app\main.py  and  .env
echo ========================================
if not exist "app\main.py" (
  echo ERROR: app\main.py not found. Do not run this from the repo root.
  echo Use: backend\run_backend.bat  OR  cd backend  then  python -m uvicorn ...
  pause
  exit /b 1
)
if exist "D:\Python312\python.exe" (
  set "PY=D:\Python312\python.exe"
) else (
  set "PY=python"
)
echo Python: %PY%
"%PY%" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
pause
