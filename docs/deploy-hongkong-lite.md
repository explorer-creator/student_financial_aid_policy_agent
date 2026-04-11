# 香港轻量云：Docker 单链接部署

目标：评委只打开 **`http://服务器公网IP:8080`**（或日后 **`https://你的域名`**）即可使用「广工学工数智助手」；无需 Vercel / Render；前端与 API **同域**，构建时 **`VITE_API_BASE` 为空** 即可。

## 前提

- 已购买 **腾讯云轻量应用服务器**，地域 **香港**，镜像 **Ubuntu 22.04**（或兼容版本）。
- 本地能 **SSH** 登录该服务器（密码或密钥）。

## 1. 防火墙

在腾讯云控制台 → 轻量 → 该实例 → **防火墙**，添加规则：

- **端口**：`8080`，协议 TCP，来源 `0.0.0.0/0`（答辩演示用；长期可收紧为你的办公网 IP）。

（若后续在主机上做 **HTTPS 443**，再放行 **80 / 443**。）

## 2. 登录服务器并执行脚本

```bash
ssh ubuntu@<服务器公网IP>
# 若镜像用户为 root，则 ssh root@...

sudo apt-get update
sudo apt-get install -y git
git clone https://github.com/explorer-creator/student_financial_aid_policy_agent.git
cd student_financial_aid_policy_agent
bash scripts/deploy_hongkong_lite.sh
```

- 若提示 **重新登录** 以使 `docker` 组生效：输入 `exit`，再 SSH 登录一次，然后：

```bash
cd ~/student_financial_aid_policy_agent
bash scripts/deploy_hongkong_lite.sh
```

- 若提示编辑 **`.env`**：在仓库根目录执行 `nano .env`，至少填写：

```env
OPENAI_API_KEY=你的DeepSeek_sk
OPENAI_BASE_URL=https://api.deepseek.com/v1
MODEL=deepseek-chat
CORS_ORIGINS=*
```

保存后再次：`bash scripts/deploy_hongkong_lite.sh`

## 3. 验收

浏览器（可用手机 4G，不挂梯子试）打开：

- `http://<公网IP>:8080` → 应出现应用界面。  
- `http://<公网IP>:8080/health` → `{"status":"ok"}` 类响应。  
- `http://<公网IP>:8080/docs` → Swagger 文档。

## 4. 更新版本

```bash
cd ~/student_financial_aid_policy_agent
git pull
bash scripts/deploy_hongkong_lite.sh
```

## 5. HTTPS（可选，推荐正式答辩）

在主机安装 **Caddy** 或 **Nginx + certbot**，把 **443** 反代到 **`127.0.0.1:8080`**，域名 **A 记录** 指向该服务器 IP。此时评委入口改为 **`https://你的域名`**，并在 `.env` 将 `CORS_ORIGINS` 改为该 `https://` 源（不要用 `*` 亦可）。

## 说明

- **学习材料**依赖服务器上的 `02教材5本` 或 `LEARNING_MATERIALS_DIR`；未挂载时仅影响「学习材料」页，不影响政策问答与智能工具。  
- 我无法代你登录腾讯云或执行 SSH；请在本机终端完成上述命令。
