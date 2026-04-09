# 广东工业大学学生资助政策智能体

> 面向高校资助场景的智能问答与业务辅助演示系统（FastAPI + React + Vite）。

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-Frontend-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-Build-646CFF?logo=vite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

## 在线体验

- `GitHub Pages 静态演示（推荐）`：`https://<你的用户名>.github.io/student_financial_aid_policy_agent/`
- `本地开发地址`：`http://localhost:5173`

> Pages 版默认是静态演示模式（不依赖后端），可在手机与网页端正常访问。

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
