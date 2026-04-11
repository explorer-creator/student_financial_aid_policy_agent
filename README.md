# 广工学工数智助手

> 广东工业大学学工场景一站式智能服务演示（资助政策、思政学习、心理陪伴、红歌灵境、智能工具等；FastAPI + React + Vite）。

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-Frontend-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-Build-646CFF?logo=vite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

## 在线体验

- `GitHub Pages 静态演示（推荐）`：`https://<你的用户名>.github.io/student_financial_aid_policy_agent/`
- **`Vercel` / `Netlify`（公网「扩音器」）**：见下文 **「部署到 Vercel / Netlify」** 一节，可得到 `*.vercel.app` / `*.netlify.app` 全球可访问地址。
- `本地开发地址`：`http://localhost:5173`

> Pages / 未配置 `VITE_API_BASE` 的静态托管默认是**静态演示模式**（不依赖后端），可在手机与网页端正常访问。若要公网调用大模型与智能工具 API，需另部署后端并在构建时写入 `VITE_API_BASE`。

## 项目亮点

- 广东工业大学资助政策问答（含官方链接引导）
- 资格审查、政策匹配、窗口期提醒、资助试算
- 隐形贫困识别辅助、预审导出、数据看板
- 侧栏式多页面导航（政策文件、联系方式、事件进度、反馈箱、管理入口）
- 双主题切换（`🌞 浅色正式版 / 🌙 深色夜间版`）
- 对开源展示友好：支持 GitHub Pages 静态演示发布

## 界面预览（替换为你的截图/动图）

> 建议将素材放到 `docs/media/` 目录。

### Web 端首页
![Web Preview](docs/media/web-home.png)

### 手机端预览
![Mobile Preview](docs/media/mobile-home.png)

### 功能演示动图
![Demo GIF](docs/media/feature-demo.gif)

## 技术栈与目录

- 前端：`React 18 + TypeScript + Vite`
- 后端：`FastAPI + Pydantic`
- 部署：`Docker Compose`、`GitHub Pages（静态演示）`

```text
backend/      # API 与政策知识库
frontend/     # Web 前端
scripts/      # 脚本示例（含 Playwright 模板）
.github/      # CI/CD（Pages 自动发布）
```

## 核心能力（API）

| 能力 | 方法 | 路径 | 说明 |
|---|---|---|---|
| 大脑状态 | GET | `/api/brain/status` | 是否已接通 LLM（OpenAI 兼容或 Ollama） |
| 政策问答 | POST | `/api/chat` | 7×24 自然语言问答 |
| 资格审查 | POST | `/api/eligibility/screen` | 规则校验并输出异常名单 |
| 隐形贫困提示 | POST | `/api/insights/poverty-risk` | 启发式风险评分（演示） |
| 政策推荐 | POST | `/api/recommendations/auto` | 免申即享/主动推送（演示） |
| 资助试算 | POST | `/api/calculator/aid-estimate` | 理论额度估算（演示） |
| 奖项匹配 | POST | `/api/match/awards` | 国/校/社会奖项匹配（演示） |
| 窗口期目录 | GET | `/api/policy/windows` | 常见申请窗口月份 |
| 窗口期提醒 | POST | `/api/push/reminders` | 推送提醒内容（演示） |
| 隐形贫困识别 | POST | `/api/hidden-poverty/detect` | 多维消费识别辅助（演示） |
| 资格预审 | POST | `/api/precheck/run` | 输出符合条件与异常清单 |
| 预审导出 | POST | `/api/precheck/export.xlsx` | 导出双 sheet Excel |
| 数据看板 | GET | `/api/dashboard/summary` | 进度、完成率、异议示例 |

## 快速开始

### 方式一：本地开发

后端：

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

前端：

```bash
cd frontend
npm install
npm run dev
```

可选：在 `backend/.env` 设置 `OPENAI_API_KEY`（及 `OPENAI_BASE_URL`、`MODEL`）。

**接通「大脑」（大模型）**

- **云端**：`OPENAI_API_KEY` + 可选 `OPENAI_BASE_URL`、`MODEL`（任意 OpenAI 兼容网关均可）。**不装 Ollama** 时可用 [DeepSeek 官方 API](https://platform.deepseek.com)：`OPENAI_BASE_URL=https://api.deepseek.com/v1`，`MODEL=deepseek-chat` 或 `deepseek-reasoner`（费用与额度见官网）。
- **本机 Ollama（免云密钥）**：安装 [Ollama](https://ollama.com) 后执行 `ollama pull deepseek-r1:7b`（默认模型名与 `backend` 配置一致）。在 `backend/.env` 设置 `OLLAMA_BASE_URL=http://127.0.0.1:11434/v1` 与 `OLLAMA_MODEL=deepseek-r1:7b`，**不要**填写 `OPENAI_API_KEY`。重启后端，访问 `GET /api/brain/status` 应返回 `has_brain: true`。
- **模型放到 D 盘**：设置用户环境变量 `OLLAMA_MODELS` 指向如 `D:\Ollama\models`，退出并重启 Ollama 后再 `ollama pull`。可用仓库脚本：`powershell -ExecutionPolicy Bypass -File scripts/setup-ollama-d-drive.ps1`（默认目录 `D:\Ollama\models`，可改参数 `-ModelDir`）。

### 方式二：Docker 一键运行

```bash
docker compose up --build
```

访问：`http://localhost:8080`

## GitHub 开源与静态演示站

仓库已包含工作流：`.github/workflows/frontend-pages.yml`。

1. 推送代码到 `main` 分支。
2. 在仓库 Settings -> Pages -> Build and deployment 选择 **GitHub Actions**。
3. 每次修改 `frontend/**` 并 push 后，自动发布 Pages 演示站。

### 本地先按 Pages 参数构建（推荐）

```bash
cd frontend
npm install
$env:VITE_DEMO_ONLY="true"; $env:VITE_BASE_PATH="/student_financial_aid_policy_agent/"; npm run build:pages
```

构建后用 `frontend/dist` 目录做静态托管即可。

## 部署到 Vercel / Netlify（公网入口）

前端为 **Vite 静态构建产物**（`frontend/dist`），后端 **FastAPI 需单独部署**（如 Render、Railway、Fly.io、自有服务器）。以下只把「网页」扩到公网；API 地址通过环境变量注入构建。

### 通用环境变量（构建前在平台 UI 里配置）

| 变量 | 说明 |
|------|------|
| `VITE_API_BASE` | 后端根地址，**不要**末尾斜杠。例：`https://your-api.onrender.com`。不填则前端请求同源 `/api`（纯静态站无 API → 演示/404）。 |
| `VITE_DEMO_ONLY` | **`true`**：整站静态演示、不调后端。**要让评委用 DeepSeek，必须为 `false` 或不设置**，并正确配置 `VITE_API_BASE`。 |
| `VITE_BASE_PATH` | 一般留空或 `/`。仅当站点挂在子路径（如 GitHub Pages 子目录）时设为 `/repo名/`。 |

**CORS**：后端默认 `CORS_ORIGINS=*`（见 `backend/app/config.py`），任意 `*.vercel.app` / `*.netlify.app` 可跨域访问。若你改为白名单，须包含前端完整源，例如 `https://xxx.vercel.app`。

**评委公测 DeepSeek（检查清单）**

1. **后端**部署到公网（如 [Render](https://render.com) / [Railway](https://railway.app) / 自有 HTTPS），健康检查：`GET https://你的API/health` 返回 `{"status":"ok"}`；`GET https://你的API/api/brain/status` 在配置密钥后应显示已接通大脑。  
2. 在**后端平台**设置环境变量（与 `backend/.env.example` 一致）：`OPENAI_API_KEY`、`OPENAI_BASE_URL=https://api.deepseek.com/v1`、`MODEL=deepseek-chat`（密钥只在服务端，勿写进前端仓库）。  
3. **前端**（Vercel/Netlify）构建变量：`VITE_API_BASE=https://你的API`（无 `/` 结尾），**不要**把 `VITE_DEMO_ONLY` 设为 `true`。保存后**重新触发一次 Deploy**（Vite 在 `npm run build` 时把 `VITE_*` 编译进 JS，改环境变量后必须重构建）。  
4. 用无痕窗口打开前端站 →「政策问答」或「心灵之窗」发一句 → 应返回模型生成内容而非「演示模式」固定文案。

前端变量模板见 `frontend/.env.example`。

### Vercel

1. 登录 [vercel.com](https://vercel.com)，**Add New… → Project**，导入本 Git 仓库。
2. **Root Directory** 设为 **`frontend`**（重要）。
3. Framework Preset 选 **Vite**（或保持自动检测）。
4. **Environment Variables**：  
   - 评委用 DeepSeek：`VITE_API_BASE` = `https://你的后端域名`（**无末尾 /**），**删除**或设为 `false` 的 `VITE_DEMO_ONLY`。  
   - 仅静态演示：`VITE_DEMO_ONLY` = `true`，可不填 `VITE_API_BASE`。  
5. **Deploy**。完成后得到 `https://<项目名>.vercel.app`。
6. 仓库内已含 `frontend/vercel.json`（SPA 回退），无需再改。

若之后改用路径路由（非 Hash），当前回退规则仍适用。

### Netlify

1. 登录 [netlify.com](https://www.netlify.com)，**Add new site → Import an existing project**，连接同一仓库。
2. 构建选项会读取仓库根目录的 **`netlify.toml`**：`base = frontend`，`publish = dist`，无需在 UI 里再选目录（也可在 UI 覆盖）。
3. 在 **Site configuration → Environment variables** 添加上表变量。
4. **Deploy site**。域名形如 `https://<随机名>.netlify.app`，可在域名页自定义子域。

### 与后端的组合关系

| 阶段 | 前端 | 后端 |
|------|------|------|
| 仅演示交作业 | Vercel/Netlify + `VITE_DEMO_ONLY=true` | 可不部署 |
| 全功能联调 | 同上 + `VITE_API_BASE=https://你的API` | 公网 HTTPS + CORS 放行前端域 |

## 手机端与网页端适配说明

- 已实现响应式布局：侧栏在手机端自动折叠为菜单
- 按钮与输入区做了触控尺寸优化
- 主题切换在移动端与桌面端均可使用

## 政策来源与合规声明

- 国家层面：如财教〔2021〕310号、财教〔2024〕181号、财教〔2024〕188号等公开文件
- 学校层面：广东工业大学学生工作处与学生资助管理中心公开信息
- 智能体回答仅供参考，实际审批结果与时间材料以学校及学院当年正式通知为准

## 路线图

- [x] 多页面门户 + 资助政策链接导航
- [x] 双主题切换（浅色/夜间）
- [x] GitHub Pages 静态演示
- [ ] 实时图表看板（ECharts）
- [ ] 后台管理 RBAC 与审计日志
- [ ] 与真实业务系统接口对接（按权限）

## 贡献

欢迎通过 Issue / PR 参与：

1. Fork 仓库并创建分支
2. 提交变更并说明动机
3. 发起 PR，附上测试说明与截图

## License

MIT
