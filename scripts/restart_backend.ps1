# Restart FastAPI backend on port 8000 (run from repo: powershell -File scripts/restart_backend.ps1)
$ErrorActionPreference = "SilentlyContinue"
$backend = (Join-Path $PSScriptRoot "..\backend" | Resolve-Path).Path
Set-Location $backend

foreach ($conn in Get-NetTCPConnection -LocalPort 8000 -State Listen) {
  try {
    Stop-Process -Id $conn.OwningProcess -Force
    Write-Host "Stopped PID $($conn.OwningProcess)"
  } catch {}
}
Start-Sleep -Seconds 1

$py = $null
if (Test-Path "D:\Python312\python.exe") {
  $py = "D:\Python312\python.exe"
}
if (-not $py) {
  foreach ($name in @("python", "py")) {
    $g = Get-Command $name -ErrorAction SilentlyContinue
    if ($g) {
      $py = $g.Source
      break
    }
  }
}
if (-not $py) {
  Write-Error "Python not found."
  exit 1
}

Write-Host "Python: $py"
Write-Host "Cwd: $backend"
& $py -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
