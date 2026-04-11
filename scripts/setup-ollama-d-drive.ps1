# 将 Ollama 模型目录设到 D 盘，并提示拉取 deepseek-r1:7b
# 用法：在 PowerShell 中执行
#   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned -Force   # 若脚本被拦截，仅首次
#   .\scripts\setup-ollama-d-drive.ps1
#
# 说明：OLLAMA_MODELS 为 Ollama 官方支持的「模型存放路径」环境变量（见 https://docs.ollama.com/faq ）

param(
    [string]$ModelDir = "D:\Ollama\models"
)

$ErrorActionPreference = "Stop"

Write-Host "== Ollama 模型目录 -> $ModelDir ==" -ForegroundColor Cyan

if (-not (Test-Path $ModelDir)) {
    New-Item -ItemType Directory -Path $ModelDir -Force | Out-Null
    Write-Host "已创建目录: $ModelDir"
} else {
    Write-Host "目录已存在: $ModelDir"
}

# 用户级环境变量，Ollama 托盘程序重启后会读取
[Environment]::SetEnvironmentVariable("OLLAMA_MODELS", $ModelDir, "User")
Write-Host "已设置用户环境变量 OLLAMA_MODELS=$ModelDir" -ForegroundColor Green
Write-Host ""
Write-Host "请按顺序操作：" -ForegroundColor Yellow
Write-Host "  1. 完全退出 Ollama（任务栏图标 -> Quit）"
Write-Host "  2. 重新从开始菜单启动 Ollama"
Write-Host "  3. 打开「新的」PowerShell 窗口，执行："
Write-Host "       ollama pull deepseek-r1:7b" -ForegroundColor White
Write-Host ""
Write-Host "本项目的 backend/.env 建议包含（与 Ollama 默认 API 一致）："
Write-Host "  OLLAMA_BASE_URL=http://127.0.0.1:11434/v1"
Write-Host "  OLLAMA_MODEL=deepseek-r1:7b"
Write-Host "  （不要填 OPENAI_API_KEY，否则会走云端而非 Ollama）"
Write-Host ""
