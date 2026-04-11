#!/usr/bin/env bash
# 在香港轻量（Ubuntu）上一键拉代码 + Docker 部署。用法：
#   bash scripts/deploy_hongkong_lite.sh
# 首次若未装 Docker，会提示重新登录后再跑一次。
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/explorer-creator/student_financial_aid_policy_agent.git}"
INSTALL_DIR="${INSTALL_DIR:-$HOME/student_financial_aid_policy_agent}"

if ! command -v git >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y git
fi

if ! command -v docker >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y docker.io docker-compose-v2
  sudo usermod -aG docker "$USER" 2>/dev/null || true
  echo "=========================================="
  echo "已安装 Docker。请执行: exit 后重新 SSH 登录，再运行:"
  echo "  bash scripts/deploy_hongkong_lite.sh"
  echo "=========================================="
  exit 0
fi

if [[ ! -d "$INSTALL_DIR/.git" ]]; then
  git clone "$REPO_URL" "$INSTALL_DIR"
fi
cd "$INSTALL_DIR"
git pull --rebase || git pull || true

if [[ ! -f .env ]]; then
  cat <<'EOF' >.env
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.deepseek.com/v1
MODEL=deepseek-chat
CORS_ORIGINS=*
EOF
  echo "已生成 .env 模板。请编辑填入密钥后重跑本脚本:"
  echo "  nano $INSTALL_DIR/.env   # 至少填写 OPENAI_API_KEY"
  echo "  bash scripts/deploy_hongkong_lite.sh"
  exit 1
fi

if ! grep -qE '^OPENAI_API_KEY=[^[:space:]]' .env; then
  echo "错误: .env 中 OPENAI_API_KEY 不能为空。编辑后重试:"
  echo "  nano $INSTALL_DIR/.env"
  exit 1
fi

docker compose up -d --build

echo "=========================================="
echo "部署完成。"
echo "  入口: http://<本机公网IP>:8080"
echo "  API 文档: http://<本机公网IP>:8080/docs"
echo "请在腾讯云控制台「防火墙」放行 TCP 8080；生产建议主机再挂 Nginx/Caddy 做 HTTPS。"
echo "=========================================="
