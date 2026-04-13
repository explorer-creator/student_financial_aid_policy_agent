# 结束占用 TCP 8000 的监听进程（需在本机 PowerShell 运行；必要时右键「以管理员身份运行」）
$ErrorActionPreference = "Continue"
Write-Host "Scanning port 8000..."
$seen = [System.Collections.Generic.HashSet[int]]::new()
netstat -ano | ForEach-Object {
  if ($_ -match '^\s*TCP\s+.*:8000\s+.*LISTENING\s+(\d+)\s*$') {
    $procId = [int]$Matches[1]
    if ($procId -gt 0 -and $seen.Add($procId)) {
      Write-Host "taskkill /F /PID $procId"
      & cmd.exe /c "taskkill /F /PID $procId"
    }
  }
}
Start-Sleep -Seconds 1
Write-Host "Remaining LISTEN on 8000:"
netstat -ano | findstr ":8000"
Write-Host "Done."
