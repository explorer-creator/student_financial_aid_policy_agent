@echo off
chcp 65001 >nul
REM Start API from repo root: switches to backend\ so "app" package resolves
cd /d "%~dp0backend"
if not exist "app\main.py" (
  echo ERROR: backend\app\main.py not found. Check folder layout.
  pause
  exit /b 1
)
echo Working directory: %CD%
if exist "D:\Python312\python.exe" (
  set "PY=D:\Python312\python.exe"
) else (
  set "PY=python"
)
"%PY%" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
pause
