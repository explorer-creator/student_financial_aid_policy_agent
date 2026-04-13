# 前后端与网络层通信 — PPT 用图

> 使用方式：把下面 **Mermaid** 代码块复制到 [https://mermaid.live](https://mermaid.live) ，右上角 **Actions → PNG/SVG** 导出后插入 PPT。  
> 若 PPT 不支持 Mermaid，用导出的 **PNG** 即可。

---

## 图 1：总体架构（分层 + 双域名）

展示：**静态前端** 与 **动态 API** 分离部署；浏览器在运行时跨域调用后端；后端再调用大模型。

```mermaid
flowchart TB
  subgraph User["用户层"]
    U[浏览器 / 移动端 WebView]
  end

  subgraph Net["网络层 Internet"]
    DNS[DNS 解析]
    TLS[HTTPS / TLS 加密传输]
  end

  subgraph CDN["前端托管 Vercel"]
    V[静态资源: HTML / JS / CSS]
    Vnote["构建时写入 VITE_API_BASE\n= 后端根地址"]
  end

  subgraph API["后端托管 Render"]
    F[FastAPI 应用]
    R1["/health /docs"]
    R2["/api/chat 等"]
    R3["/api/* 智能工具"]
  end

  subgraph LLM["模型服务公网"]
    D[DeepSeek OpenAI 兼容 API]
  end

  U --> DNS
  DNS --> TLS
  TLS --> V
  V -.-> Vnote
  U -->|"② 运行时 HTTPS\nJSON 请求"| TLS
  TLS -->|"跨域 CORS"| F
  F --> R1
  F --> R2
  F --> R3
  R2 -->|"③ HTTPS\nBearer / API Key"| D
```

**口播提示（可选）：**

1. **①** 用户先访问 Vercel，只拉静态页；API 地址已在构建时打进 JS。  
2. **②** 对话与工具在浏览器内通过 **HTTPS** 请求 Render 上的 **同源 API 前缀**（跨域由后端 `CORS` 放行）。  
3. **③** 需要生成内容时，由 **Render 服务端** 调用 DeepSeek，**密钥不经过浏览器**。

---

## 图 2：单次「政策问答」请求时序（网络视角）

适合讲清：**谁发起、谁中转、谁出答案**。

```mermaid
sequenceDiagram
  autonumber
  participant B as 浏览器
  participant V as Vercel CDN
  participant R as Render API
  participant M as DeepSeek

  B->>V: GET 页面与 JS/CSS（首屏）
  V-->>B: 200 静态文件
  Note over B: 用户输入问题后…
  B->>R: POST /api/chat HTTPS + JSON
  R->>M: POST /v1/chat/completions HTTPS
  M-->>R: 模型输出
  R-->>B: JSON 回复（含 assistant 文本）
```

---

## 图 3：一页 PPT 用的「分层对照表」（无 Mermaid 也可直接做表格）

| 层级 | 部署位置 | 主要协议 | 典型内容 |
|------|-----------|----------|----------|
| 表现层 | 用户设备 | HTTPS | 浏览器执行 React，展示 UI |
| 边缘/静态 | Vercel | HTTPS | `*.vercel.app` 托管 `index.html` 与打包 JS |
| 应用 API | Render | HTTPS | `*.onrender.com` FastAPI `/api/*` |
| 外部智能 | DeepSeek 等 | HTTPS | 仅后端出网调用，返回生成文本 |

---

## 图 4：简化拓扑（适合做「一页一个大图」）

```mermaid
flowchart LR
  A[用户] -->|HTTPS| B[Vercel\n前端静态]
  A -->|HTTPS JSON| C[Render\nFastAPI]
  C -->|HTTPS| D[DeepSeek]
```

---

## 图 5：Docker Compose 单入口（阿里云 ECS 等）— 拓扑

与仓库 `docker-compose.yml` 一致：**只对外暴露 8080**；浏览器访问的 **HTML/JS 与 `/api` 为同一主机:端口**，由 **前端容器内 Nginx** 反代到 **backend:8000**（Docker 内网，不映射到宿主机）。

```mermaid
flowchart TB
  subgraph User["用户层"]
    BR[浏览器]
  end

  subgraph Host["云服务器宿主机 :8080"]
    subgraph FE["容器 frontend（Nginx :80）"]
      NG["nginx.conf\n/api /health /docs /openapi.json → 反代"]
      SPA["静态 dist\nReact SPA"]
    end
    subgraph BE["容器 backend（Uvicorn :8000）"]
      API["FastAPI\n/api/* /health /docs"]
    end
  end

  subgraph LLM["公网模型服务"]
    DS["DeepSeek 等\nOpenAI 兼容 HTTPS"]
  end

  BR -->|"HTTPS 或 HTTP\n:8080"| NG
  NG -->|"Docker 网络\nhttp://backend:8000"| API
  BR -->|"GET / 等"| SPA
  API -->|"仅服务端出网\nBearer / API Key"| DS
```

**口播提示：** 公网只看到 **一个入口**；**API 密钥** 在 `docker-compose` 注入的后端环境变量中，**不经由浏览器**。

---

## 图 6：Docker 下单次对话请求 — 时序（同域 + 反代）

生产构建中 **`VITE_API_BASE` 为空** 时，前端用 **相对路径** `/api/...`，请求落在 **同一 Nginx**，再由 Nginx 转到后端。

```mermaid
sequenceDiagram
  autonumber
  participant B as 浏览器
  participant N as Nginx（frontend 容器 :80）
  participant F as FastAPI（backend 容器 :8000）
  participant M as 大模型 API

  B->>N: POST /api/chat（与页面同主机:8080）
  N->>F: proxy_pass → http://backend:8000/api/chat
  F->>M: POST …/v1/chat/completions
  M-->>F: 模型输出
  F-->>N: JSON
  N-->>B: JSON
```

---

## 图 7：本地开发 vs Docker 生产（对照，可做表格页）

| 场景 | 前端入口 | `/api` 如何到后端 |
|------|-----------|-------------------|
| `npm run dev`（Vite） | `http://127.0.0.1:5173` | Vite `server.proxy` → `127.0.0.1:8000` |
| Docker Compose | `http://服务器IP:8080` | 容器内 Nginx `location /api/` → `http://backend:8000/api/` |
| Vercel + Render（图 1） | `*.vercel.app` | 构建时 `VITE_API_BASE` 指向 `*.onrender.com`，浏览器直连跨域 |

---

## 图例说明（可放在 PPT 脚注）

- **双域名**：`*.vercel.app` ≠ `*.onrender.com`，属正常前后端分离架构。  
- **安全**：`OPENAI_API_KEY` 仅存在于 Render 环境变量，不出现在 Vercel 构建产物与 Git 仓库。  
- **冷启动**：Render 免费实例休眠后，**首次 API 请求**可能延迟明显增加。  
- **Docker 单入口**：密钥在服务器 `.env` / Compose 环境变量中注入 **backend**；**勿**将后端 `8000` 单独映射到公网（当前 Compose 已不映射）。
